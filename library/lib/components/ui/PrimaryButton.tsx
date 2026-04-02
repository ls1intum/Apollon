interface Props {
  children: React.ReactNode
  isSelected: boolean
  onClick: () => void
  style?: React.CSSProperties
}

const buttonBaseStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontWeight: 500,
  fontSize: "0.875rem",
  border: "1px solid var(--apollon-primary)",
  backgroundColor: "var(--apollon-background)",
  color: "var(--apollon-primary)",
  cursor: "pointer",
}

export const PrimaryButton: React.FC<Props> = ({
  children,
  isSelected,
  onClick,
  style,
}) => {
  const buttonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: isSelected
      ? "var(--apollon-primary)"
      : "var(--apollon-background)",
    color: isSelected ? "var(--apollon-background)" : "var(--apollon-primary)",
    ...style,
  }

  return (
    <button style={buttonStyle} onClick={onClick}>
      {children}
    </button>
  )
}
