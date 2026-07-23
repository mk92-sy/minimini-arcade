import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { equipItem, fetchInventory, fetchStoreItems, purchaseItem, useConsumable } from "../lib/store.js";
import { games } from "../data/games.js";
import { IconCoin } from "../components/common/icons.jsx";
import usePageTitle from "../hooks/usePageTitle.js";

const CATEGORY_TABS = [
  { key: "all", label: "전체" },
  { key: "cosmetic", label: "꾸미기" },
  { key: "utility", label: "게임 편의" },
];

const EQUIP_SLOT_BY_SUBCATEGORY = {
  nickname_color: "equipped_nickname_color",
  badge: "equipped_badge",
  border: "equipped_border",
};

const RETRY_GAME_OPTIONS = games.filter((g) => g.implemented);

// 정가(item.price)에서 할인율(discount_percent)만큼 뺀 실제 결제가.
// 서버(purchase_store_item)도 동일한 공식(반올림)으로 계산해서 차감하므로 항상 일치해요.
function getEffectivePrice(item) {
  const discount = item.discount_percent ?? 0;
  if (discount <= 0) return item.price;
  return Math.round((item.price * (100 - discount)) / 100);
}

function purchaseErrorMessage(error) {
  const msg = error?.message ?? "";
  if (msg.includes("INSUFFICIENT_COINS")) return "코인이 부족해요.";
  if (msg.includes("ALREADY_OWNED")) return "이미 보유 중인 아이템이에요.";
  if (msg.includes("NOT_AUTHENTICATED")) return "로그인이 필요해요.";
  return "구매에 실패했어요. 잠시 후 다시 시도해주세요.";
}

function useErrorMessage(error) {
  const msg = error?.message ?? "";
  if (msg.includes("ITEM_NOT_OWNED")) return "보유하고 있지 않은 아이템이에요.";
  if (msg.includes("GAME_ID_REQUIRED")) return "어떤 게임에 사용할지 먼저 선택해주세요.";
  return "사용에 실패했어요. 잠시 후 다시 시도해주세요.";
}

function ItemPreview({ item }) {
  const discount = item.discount_percent ?? 0;
  const badge = discount > 0 && (
    <span className="store-item__discount-badge" aria-label={`${discount}% 할인`}>
      -{discount}%
    </span>
  );

  if (item.subcategory === "nickname_color") {
    return (
      <span className="store-item__preview-wrap">
        {badge}
        <span className="store-item__preview" style={{ background: item.color_hex }} aria-hidden="true" />
      </span>
    );
  }
  if (item.icon) {
    return (
      <span className="store-item__preview-wrap">
        {badge}
        <span className="store-item__preview store-item__preview--icon" aria-hidden="true">
          {item.icon}
        </span>
      </span>
    );
  }
  return (
    <span className="store-item__preview-wrap">
      {badge}
      <span className="store-item__preview store-item__preview--border" aria-hidden="true">
        ✦
      </span>
    </span>
  );
}

export default function Store() {
  usePageTitle("상점");
  const {
    isConfigured,
    user,
    coins,
    equippedNicknameColor,
    equippedBadge,
    equippedBorder,
    openAuthModal,
    updateLocalProfile,
  } = useAuth();

  const [tab, setTab] = useState("shop"); // shop | inventory
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState({}); // { [itemId]: quantity }
  const [cart, setCart] = useState([]); // [{ itemId, quantity }]
  const [loading, setLoading] = useState(true);

  const [checkoutStatus, setCheckoutStatus] = useState("idle"); // idle | processing | done | error
  const [checkoutError, setCheckoutError] = useState("");

  const [equipStatus, setEquipStatus] = useState({}); // { [itemId]: 'busy' }
  const [useStatus, setUseStatus] = useState({}); // { [itemId]: 'busy' }
  const [useError, setUseError] = useState({}); // { [itemId]: string }
  const [retrySelection, setRetrySelection] = useState(RETRY_GAME_OPTIONS[0]?.id ?? "");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStoreItems().then((data) => {
      if (!cancelled) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setInventory({});
      return;
    }
    fetchInventory(user.id).then((data) => {
      if (!cancelled) setInventory(data);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const itemById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const filteredItems = useMemo(
    () => (category === "all" ? items : items.filter((i) => i.category === category)),
    [items, category],
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, entry) => {
        const item = itemById[entry.itemId];
        return sum + (item ? getEffectivePrice(item) : 0) * entry.quantity;
      }, 0),
    [cart, itemById],
  );

  const cartQuantityFor = (itemId) => cart.find((c) => c.itemId === itemId)?.quantity ?? 0;

  const addToCart = (item) => {
    if (!user) {
      openAuthModal();
      return;
    }
    setCheckoutStatus("idle");

    if (item.stackable) {
      setCart((prev) => {
        const existing = prev.find((c) => c.itemId === item.id);
        if (existing) {
          return prev.map((c) => (c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        }
        return [...prev, { itemId: item.id, quantity: 1 }];
      });
      return;
    }

    // 코스메틱: 이미 보유 중이면 담을 수 없고, 담기/취소만 토글
    if ((inventory[item.id] ?? 0) > 0) return;
    setCart((prev) =>
      prev.some((c) => c.itemId === item.id)
        ? prev.filter((c) => c.itemId !== item.id)
        : [...prev, { itemId: item.id, quantity: 1 }],
    );
  };

  const changeCartQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev.map((c) => (c.itemId === itemId ? { ...c, quantity: c.quantity + delta } : c)).filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (itemId) => setCart((prev) => prev.filter((c) => c.itemId !== itemId));

  const handleCheckout = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (cart.length === 0) return;

    setCheckoutStatus("processing");
    setCheckoutError("");

    const remaining = [...cart];
    let latestCoins = coins;

    for (const entry of cart) {
      const { data, error } = await purchaseItem(entry.itemId, entry.quantity);
      if (error) {
        setCheckoutError(purchaseErrorMessage(error));
        setCheckoutStatus("error");
        setCart(remaining);
        updateLocalProfile({ coins: latestCoins });
        return;
      }
      latestCoins = data.new_coins;
      remaining.shift();
      setInventory((prev) => ({ ...prev, [entry.itemId]: data.new_quantity }));
    }

    updateLocalProfile({ coins: latestCoins });
    setCart([]);
    setCheckoutStatus("done");
  };

  const handleEquip = async (item) => {
    setEquipStatus((s) => ({ ...s, [item.id]: "busy" }));
    const { data, error } = await equipItem(item.id);
    setEquipStatus((s) => ({ ...s, [item.id]: null }));
    if (error) return;
    updateLocalProfile(data);
  };

  const handleUse = async (item) => {
    const gameId = item.subcategory === "retry_ticket" ? retrySelection : null;
    setUseStatus((s) => ({ ...s, [item.id]: "busy" }));
    setUseError((e) => ({ ...e, [item.id]: "" }));
    const { data, error } = await useConsumable(item.id, gameId);
    setUseStatus((s) => ({ ...s, [item.id]: null }));
    if (error) {
      setUseError((e) => ({ ...e, [item.id]: useErrorMessage(error) }));
      return;
    }
    setInventory((prev) => ({ ...prev, [item.id]: data.remaining_quantity }));
  };

  const isEquipped = (item) => {
    const slot = EQUIP_SLOT_BY_SUBCATEGORY[item.subcategory];
    if (slot === "equipped_nickname_color") return equippedNicknameColor === item.id;
    if (slot === "equipped_badge") return equippedBadge === item.id;
    if (slot === "equipped_border") return equippedBorder === item.id;
    return false;
  };

  if (!isConfigured) return null;

  const ownedItems = items.filter((item) => (inventory[item.id] ?? 0) > 0);

  return (
    <>
      <div className="hub">
        <div className="store-page">
          <div className="store-tabs">
            <button
              type="button"
              className={`store-tabs__item${tab === "shop" ? " store-tabs__item--active" : ""}`}
              onClick={() => setTab("shop")}
            >
              상점
            </button>
            <button
              type="button"
              className={`store-tabs__item${tab === "inventory" ? " store-tabs__item--active" : ""}`}
              onClick={() => setTab("inventory")}
            >
              내 아이템{ownedItems.length > 0 ? ` (${ownedItems.length})` : ""}
            </button>
          </div>

          {tab === "shop" && (
            <>
              <div className="store-category-tabs">
                {CATEGORY_TABS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`store-category-tabs__item${category === c.key ? " store-category-tabs__item--active" : ""}`}
                    onClick={() => setCategory(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {loading && <p className="store-page__empty">상품을 불러오는 중...</p>}

              {!loading && (
                <div className="store-grid">
                  {filteredItems.map((item) => {
                    const owned = (inventory[item.id] ?? 0) > 0;
                    const inCartQty = cartQuantityFor(item.id);
                    return (
                      <div key={item.id} className="store-item">
                        <ItemPreview item={item} />
                        <div className="store-item__body">
                          <p className="store-item__name">{item.name}</p>
                          <p className="store-item__desc">{item.description}</p>
                          <p className="store-item__price">
                            {item.discount_percent > 0 && (
                              <span className="store-item__price-original">{item.price.toLocaleString("ko-KR")}</span>
                            )}
                            <IconCoin width="14" height="14" /> {getEffectivePrice(item).toLocaleString("ko-KR")}
                          </p>
                        </div>

                        {item.stackable ? (
                          inCartQty > 0 ? (
                            <div className="store-item__stepper">
                              <button
                                type="button"
                                onClick={() => changeCartQuantity(item.id, -1)}
                                aria-label="수량 감소"
                              >
                                −
                              </button>
                              <span>{inCartQty}</span>
                              <button
                                type="button"
                                onClick={() => changeCartQuantity(item.id, 1)}
                                aria-label="수량 증가"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button type="button" className="store-item__add-button" onClick={() => addToCart(item)}>
                              장바구니 담기
                            </button>
                          )
                        ) : owned ? (
                          <span className="store-item__owned-badge">보유중</span>
                        ) : (
                          <button
                            type="button"
                            className={`store-item__add-button${inCartQty > 0 ? " store-item__add-button--active" : ""}`}
                            onClick={() => addToCart(item)}
                          >
                            {inCartQty > 0 ? "담음 ✓ (취소)" : "장바구니 담기"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === "inventory" && (
            <div className="store-inventory">
              {!user && <p className="store-page__empty">로그인하면 보유 아이템을 확인할 수 있어요.</p>}
              {user && ownedItems.length === 0 && <p className="store-page__empty">아직 보유한 아이템이 없어요.</p>}

              {user && ownedItems.length > 0 && (
                <>
                  <p className="store-inventory__note">
                    ※ 재도전권 / 되돌리기는 지금은 보유·소모 처리만 동작해요. 실제 게임 내 효과 연동은 곧 추가될
                    예정이에요.
                  </p>
                  <ul className="store-inventory__list">
                    {ownedItems.map((item) => {
                      const qty = inventory[item.id] ?? 0;
                      return (
                        <li key={item.id} className="store-inventory__row">
                          <ItemPreview item={item} />
                          <div className="store-item__body">
                            <p className="store-item__name">{item.name}</p>
                            <p className="store-item__desc">{item.description}</p>
                            {item.stackable && <p className="store-inventory__qty">보유 수량: {qty}개</p>}
                          </div>

                          {item.category === "cosmetic" ? (
                            <button
                              type="button"
                              className={`store-item__equip-button${isEquipped(item) ? " store-item__equip-button--active" : ""}`}
                              onClick={() => handleEquip(item)}
                              disabled={equipStatus[item.id] === "busy"}
                            >
                              {isEquipped(item) ? "장착됨 (해제)" : "장착하기"}
                            </button>
                          ) : (
                            <div className="store-inventory__use-block">
                              {item.subcategory === "retry_ticket" && (
                                <select
                                  className="store-inventory__game-select"
                                  value={retrySelection}
                                  onChange={(e) => setRetrySelection(e.target.value)}
                                >
                                  {RETRY_GAME_OPTIONS.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.title}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                className="store-item__use-button"
                                onClick={() => handleUse(item)}
                                disabled={useStatus[item.id] === "busy" || qty <= 0}
                              >
                                사용하기
                              </button>
                              {useError[item.id] && <p className="store-cart__error">{useError[item.id]}</p>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        {tab !== "inventory" && (
          <div className="store-page__footer">
            <div className="store-cart">
              <p className="store-cart__title">🛒 장바구니</p>
              {cart.length === 0 && <p className="store-page__empty">담은 아이템이 없어요.</p>}
              {cart.length > 0 && (
                <ul className="store-cart__list">
                  {cart.map((entry) => {
                    const item = itemById[entry.itemId];
                    if (!item) return null;
                    return (
                      <li key={entry.itemId} className="store-cart__row">
                        <span className="store-cart__name">
                          {item.name} × {entry.quantity}
                        </span>
                        <span className="store-cart__subtotal">
                          {(getEffectivePrice(item) * entry.quantity).toLocaleString("ko-KR")}
                        </span>
                        <button
                          type="button"
                          className="store-cart__remove"
                          onClick={() => removeFromCart(entry.itemId)}
                          aria-label="장바구니에서 제거"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {checkoutStatus === "error" && <p className="store-cart__error">{checkoutError}</p>}
              {checkoutStatus === "done" && (
                <p className="store-cart__success">구매가 완료됐어요! "내 아이템"에서 확인해보세요.</p>
              )}
            </div>

            {cart.length > 0 && (
              <div className="store-cart__footer">
                <div className="store-page__balance">
                  <span className="store-page__balance-label">총 금액</span>
                  <IconCoin width="16" height="16" />
                  <span className="store-page__balance-value">{cartTotal.toLocaleString("ko-KR")}</span>
                </div>
                <button
                  type="button"
                  className="store-cart__checkout-button"
                  onClick={handleCheckout}
                  disabled={checkoutStatus === "processing" || coins < cartTotal}
                >
                  {!user ? "로그인하고 구매하기" : checkoutStatus === "processing" ? "구매 중..." : "구매하기"}
                </button>
              </div>
            )}

            <div className="store-page__balance">
              <p className="store-page__balance-label">보유 코인</p>
              <IconCoin width="16" height="16" />
              <p className="store-page__balance-value">{user ? coins.toLocaleString("ko-KR") : "-"}</p>
              {!user && (
                <button type="button" className="store-page__login-button" onClick={openAuthModal}>
                  로그인하고 확인하기
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
