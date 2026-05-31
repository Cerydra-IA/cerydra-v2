export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  }
  return (
    <img
      src="/logo.png"
      alt="CERYDRA"
      className={`${sizes[size]} w-auto object-contain`}
    />
  )
}
