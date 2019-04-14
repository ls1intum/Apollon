import React, { Children, Component, ReactElement } from 'react';
import { Color, Size } from '../../theme/styles';
import { DropdownButton } from './dropdown-button';
import { DropdownItem, Props as ItemProps } from './dropdown-item';
import { DropdownMenu } from './dropdown-menu';
import { DropdownItemProps, StyledDropdown, StyledDropdownItem } from './dropdown-styles';

const defaultProps = Object.freeze({
  color: 'primary' as Color,
  outline: true,
  placeholder: '',
  size: 'sm' as Size,
});

const intialState = Object.freeze({
  show: false,
});

type Props<T> = {
  children: ReactElement<ItemProps<T>> | Array<ReactElement<ItemProps<T>>>;
  onChange?: (value: T) => void;
  value: T;
} & typeof defaultProps;

type State = typeof intialState;

export class Dropdown<T> extends Component<Props<T>, State> {
  static defaultProps = defaultProps;
  static Item = DropdownItem;
  state = intialState;

  componentWillUnmount() {
    document.removeEventListener('click', this.close);
  }

  render() {
    const { color, outline, size } = this.props;
    const selected = Children.toArray<ReactElement<ItemProps<T>>>(this.props.children).find(
      item => item.props.value === this.props.value,
    );

    return (
      <StyledDropdown>
        <DropdownButton color={color} onClick={this.show} outline={outline} size={size}>
          {selected ? selected.props.children : this.props.placeholder}
        </DropdownButton>
        {this.state.show && (
          <DropdownMenu>
            {Children.map<ReactElement<DropdownItemProps>, ReactElement<ItemProps<T>>>(
              this.props.children,
              ({ props }) => this.renderItem(props),
            )}
          </DropdownMenu>
        )}
      </StyledDropdown>
    );
  }

  renderItem(item: ItemProps<T>): ReactElement<DropdownItemProps> {
    const { size } = this.props;

    return (
      <StyledDropdownItem size={size} onClick={this.select(item.value)}>
        {item.children}
      </StyledDropdownItem>
    );
  }

  private close = () => {
    this.setState({ show: false });
  };

  private select = (value: T) => () => {
    if (!this.props.onChange) {
      return;
    }

    this.props.onChange(value);
  };

  private show = () => {
    this.setState({ show: true });
    document.addEventListener('click', this.close, { once: true });
  };
}
