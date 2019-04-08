import React, { Children, Component, ReactElement } from 'react';
import { Color, Size } from '../../theme/styles';
import { Props as ItemProps, SwitchItem } from './switch-item';
import { StyledSwitch, StyledSwitchItem, SwitchItemProps } from './switch-styles';

type Props<T> = {
  value: T;
  onChange?: (value: T) => void;
  children: ReactElement<ItemProps<T>> | Array<ReactElement<ItemProps<T>>>;
} & typeof defaultProps;

const defaultProps = Object.freeze({
  color: 'primary' as Color,
  size: 'sm' as Size,
});

export class Switch<T> extends Component<Props<T>> {
  static defaultProps = defaultProps;
  static Item = SwitchItem;

  render() {
    return (
      <StyledSwitch>
        {Children.map<ReactElement<SwitchItemProps>, ReactElement<ItemProps<T>>>(this.props.children, ({ props }) =>
          this.renderItem(props),
        )}
      </StyledSwitch>
    );
  }

  renderItem(item: ItemProps<T>): ReactElement<SwitchItemProps> {
    const { color, size, value } = this.props;
    return (
      <StyledSwitchItem color={color} onClick={this.select(item.value)} selected={item.value === value} size={size}>
        {item.children}
      </StyledSwitchItem>
    );
  }

  private select = (value: T) => () => {
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  };
}
