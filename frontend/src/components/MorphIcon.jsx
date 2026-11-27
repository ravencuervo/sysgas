export default function MorphIcon({ base, active, className = '' }) {
  return (
    <span className={`sys-morph-icon ${className}`.trim()} aria-hidden="true">
      <i className={`bi ${base} sys-morph-icon__layer sys-morph-icon__layer--base`} />
      <i className={`bi ${active} sys-morph-icon__layer sys-morph-icon__layer--active`} />
    </span>
  )
}
