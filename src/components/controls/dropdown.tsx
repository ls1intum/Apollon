import React, { Component, ReactElement, Children, cloneElement } from 'react';
import { DropdownButton } from './dropdown-button';
import { DropdownItem, Props as ItemProps } from './dropdown-item';
import { DropdownMenu } from './dropdown-menu';

type Item = ReactElement<ItemProps>;
type State = { show: boolean; value: any };
type Props = {
  value: any;
  onChange?: (value: any) => void;
  children: Item | Item[];
};

export class Dropdown extends Component<Props, State> {
  state = {
    show: false,
    value: this.props.value,
  };

  static Item = DropdownItem;

  private show = () => {
    this.setState({ show: true });
    document.addEventListener('click', this.close, {
      once: true,
    });
  };

  private close = () => {
    this.setState({ show: false });
  };

  private select = (value: any) => () => {
    this.setState({ value });
    this.props.onChange && this.props.onChange(value);
  };

  componentWillUnmount() {
    document.removeEventListener('click', this.close);
  }

  render() {
    const values = Children.toArray<Item>(this.props.children);
    const current = values
      .map(value => value.props)
      .find(props => props.value === this.state.value);

    return (
      <div>
        <DropdownButton onClick={this.show}>
          {current ? current.children : 'Select...'}
        </DropdownButton>
        {this.state.show && (
          <DropdownMenu>
            {values.map(child =>
              cloneElement(child, {
                onClick: this.select(child.props.value),
              })
            )}
          </DropdownMenu>
        )}
      </div>
    );
  }
}
