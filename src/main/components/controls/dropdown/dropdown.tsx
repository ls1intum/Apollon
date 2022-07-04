import React, { Children, Component, createRef, ReactElement } from 'react';
import { Color, Size } from '../../theme/styles';
import { DropdownButton } from './dropdown-button';
import { DropdownItem, Props as ItemProps } from './dropdown-item';
import { DropdownMenu } from './dropdown-menu';
import { DropdownItemProps, StyledDropdown, StyledDropdownItem } from './dropdown-styles';

const defaultProps = Object.freeze({
  color: 'primary' as Color,
  outline: true as boolean,
  placeholder: '',
  size: 'sm' as Size,
});

const intialState = Object.freeze({
  show: false as boolean,
  top: 0 as number,
  left: 0 as number,
  width: 0 as number,
});

export type Props<T> = {
  children: ReactElement<ItemProps<T>> | ReactElement<ItemProps<T>>[];
  onChange?: (value: T) => void;
  value: T;
} & typeof defaultProps;

type State = typeof intialState;

export class Dropdown<T> extends Component<Props<T>, State> {
  static defaultProps = defaultProps;
  static Item = DropdownItem;
  state = intialState;
  activator = createRef<HTMLButtonElement>();

  componentWillUnmount() {
    document.removeEventListener('click', this.dismiss);
  }

  render() {
    const { color, outline, size } = this.props;
    const { show, top, left, width } = this.state;
    const selected: ReactElement<ItemProps<T>> | undefined = (
      Children.toArray(this.props.children) as ReactElement<ItemProps<T>>[]
    ).find((item: ReactElement<ItemProps<T>>) => item.props.value === this.props.value);

    return (
      <StyledDropdown>
        <DropdownButton
          ref={this.activator}
          color={color}
          onClick={(event) => this.show(event)}
          outline={outline}
          size={size}
        >
          {selected ? selected.props.children : this.props.placeholder}
        </DropdownButton>
        {show && (
          <DropdownMenu style={{ top, left, minWidth: width }}>
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

  private dismiss = () => {
    if (this.activator.current) {
      const parent = this.getScrollableParent(this.activator.current);
      parent.removeEventListener('scroll', this.dismiss);
    }
    document.removeEventListener('click', this.dismiss);

    this.setState({ show: false });
  };

  private select = (value: T) => () => {
    if (!this.props.onChange) {
      return;
    }

    this.props.onChange(value);
  };

  private show = (event: React.MouseEvent) => {
    if (!this.activator.current) {
      return;
    }

    const parent = this.getScrollableParent(this.activator.current);
    const parentBounds: ClientRect = parent.getBoundingClientRect();
    const activatorBounds: ClientRect = this.activator.current.getBoundingClientRect();

    this.setState({
      show: true,
      top: activatorBounds.top - parentBounds.top + activatorBounds.height,
      left: activatorBounds.left - parentBounds.left,
      width: activatorBounds.width,
    });

    parent.addEventListener('scroll', this.dismiss, { once: true });
    document.addEventListener('click', this.dismiss, { once: true });
    event.stopPropagation();
  };

  private getScrollableParent = (element: Element): Element => {
    const style = getComputedStyle(element);

    const isScrollable = /(auto|scroll)/.test([style.overflow, style.overflowY, style.overflowX].join(''));
    if (isScrollable) {
      return element;
    }

    const parent = element.parentElement;
    if (parent) {
      return this.getScrollableParent(parent);
    }

    return document.body;
  };
}
