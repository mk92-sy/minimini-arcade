export default function ComingSoon({ icon, title, message }) {
  return (
    <div className="oos">
      <p className="oos__sign">COMING SOON</p>
      {icon}
      <h1 className="oos__title">{title}</h1>
      <p className="oos__sub">{message}</p>
    </div>
  )
}
