import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Checkbox } from "./checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "./field"
import { Input } from "./input"
import { RadioGroup, RadioGroupItem } from "./radio-group"
import { Textarea } from "./textarea"

/**
 * A composable form-field layout primitive. `Field` arranges a label, control,
 * description, and error message, with `vertical`, `horizontal`, and
 * `responsive` orientations. Group fields with `FieldGroup` and `FieldSet`.
 */
const meta = {
  title: "UI/Components/Field",
  component: Field,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["vertical", "horizontal", "responsive"],
    },
  },
  args: {
    orientation: "vertical",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Field>

export default meta

type Story = StoryObj<typeof meta>

/** A label stacked above its input. */
export const Vertical: Story = {
  render: (args) => (
    <Field {...args} className="w-72">
      <FieldLabel htmlFor="field-vertical">Email</FieldLabel>
      <Input id="field-vertical" type="email" placeholder="name@example.com" />
    </Field>
  ),
}

/** A label rendered inline beside its control. */
export const Horizontal: Story = {
  render: (args) => (
    <Field {...args} orientation="horizontal" className="w-72">
      <Checkbox id="field-horizontal" />
      <FieldLabel htmlFor="field-horizontal">Subscribe to updates</FieldLabel>
    </Field>
  ),
}

/** A `FieldDescription` adds supporting helper text below the control. */
export const WithDescription: Story = {
  render: (args) => (
    <Field {...args} className="w-72">
      <FieldLabel htmlFor="field-description">Username</FieldLabel>
      <Input id="field-description" placeholder="apollon" />
      <FieldDescription>This is your public display name.</FieldDescription>
    </Field>
  ),
}

/** Mark the field invalid and surface a `FieldError` message. */
export const WithError: Story = {
  render: (args) => (
    <Field {...args} data-invalid className="w-72">
      <FieldLabel htmlFor="field-error">Email</FieldLabel>
      <Input id="field-error" type="email" aria-invalid defaultValue="nope" />
      <FieldError>Enter a valid email address.</FieldError>
    </Field>
  ),
}

/** Group related fields under a `FieldSet` with a `FieldLegend`. */
export const FieldSetAndLegend: Story = {
  render: () => (
    <FieldSet className="w-72">
      <FieldLegend>Contact details</FieldLegend>
      <Field>
        <FieldLabel htmlFor="set-name">Name</FieldLabel>
        <Input id="set-name" placeholder="Ada Lovelace" />
      </Field>
      <Field>
        <FieldLabel htmlFor="set-email">Email</FieldLabel>
        <Input id="set-email" type="email" placeholder="ada@example.com" />
      </Field>
    </FieldSet>
  ),
}

/** Stack multiple fields with consistent spacing using `FieldGroup`. */
export const Group: Story = {
  render: () => (
    <FieldGroup className="w-72">
      <Field>
        <FieldLabel htmlFor="group-first">First name</FieldLabel>
        <Input id="group-first" placeholder="Ada" />
      </Field>
      <Field>
        <FieldLabel htmlFor="group-last">Last name</FieldLabel>
        <Input id="group-last" placeholder="Lovelace" />
      </Field>
    </FieldGroup>
  ),
}

/** A checkbox laid out as a field with description content. */
export const CheckboxField: Story = {
  render: () => (
    <Field orientation="horizontal" className="w-72">
      <Checkbox id="field-checkbox" defaultChecked />
      <FieldContent>
        <FieldLabel htmlFor="field-checkbox">Email notifications</FieldLabel>
        <FieldDescription>Receive a digest every morning.</FieldDescription>
      </FieldContent>
    </Field>
  ),
}

/** A radio group laid out as a field set. */
export const RadioField: Story = {
  render: () => (
    <FieldSet className="w-72">
      <FieldLegend variant="label">Plan</FieldLegend>
      <RadioGroup defaultValue="free" onValueChange={fn()}>
        <Field orientation="horizontal">
          <RadioGroupItem id="radio-free" value="free" />
          <FieldLabel htmlFor="radio-free">Free</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem id="radio-pro" value="pro" />
          <FieldLabel htmlFor="radio-pro">Pro</FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  ),
}

/** A representative full form assembling the field primitives together. */
export const FullForm: Story = {
  render: () => (
    <form className="w-80">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="form-name">Name</FieldLabel>
          <Input id="form-name" placeholder="Ada Lovelace" />
        </Field>
        <Field>
          <FieldLabel htmlFor="form-email">Email</FieldLabel>
          <Input id="form-email" type="email" placeholder="ada@example.com" />
          <FieldDescription>We will never share your email.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="form-message">Message</FieldLabel>
          <Textarea id="form-message" placeholder="Your message…" rows={4} />
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="form-terms" />
          <FieldLabel htmlFor="form-terms">I accept the terms</FieldLabel>
        </Field>
      </FieldGroup>
    </form>
  ),
}

/** Both orientations side by side for visual and dark-theme review. */
export const Matrix: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-8">
      <Field orientation="vertical" className="w-72">
        <FieldLabel htmlFor="matrix-vertical">Vertical</FieldLabel>
        <Input id="matrix-vertical" placeholder="Stacked" />
      </Field>
      <Field orientation="horizontal" className="w-72">
        <Checkbox id="matrix-horizontal" />
        <FieldLabel htmlFor="matrix-horizontal">Horizontal</FieldLabel>
      </Field>
    </div>
  ),
}

/** Pinned dark-theme review of an invalid field. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <Field data-invalid className="w-72">
      <FieldLabel htmlFor="field-dark">Email</FieldLabel>
      <Input id="field-dark" type="email" aria-invalid defaultValue="nope" />
      <FieldError>Enter a valid email address.</FieldError>
    </Field>
  ),
}
