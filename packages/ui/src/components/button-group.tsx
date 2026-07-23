type ButtonGroupProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
}

function ButtonGroup({
  orientation = "horizontal",
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      {...props}
    />
  )
}

export { ButtonGroup }
