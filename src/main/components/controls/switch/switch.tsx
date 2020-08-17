import React, { Children, Component, ReactElement } from 'react';
import { Color, Size } from '../../theme/styles';
import { Props as ItemProps, SwitchItem } from './switch-item';
import { StyledSwitch, StyledSwitchItem, SwitchItemProps } from './switch-styles';

const defaultProps = Object.freeze({
  color: 'primary' as Color,
  size: 'sm' as Size,
});

type Props<T> = {
  children: ReactElement<ItemProps<T>> | ReactElement<ItemProps<T>>[];
  onChange?: (value: T) => void;
  value: T;
} & typeof defaultProps;

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
    if (!this.props.onChange) {
      return;
    }

    this.props.onChange(value);
  };
}
