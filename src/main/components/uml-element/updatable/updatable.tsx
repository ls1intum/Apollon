import React, { Component, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';
import { styled } from '../../theme/styles';
import { ThemedPath } from '../../theme/themedComponents';

export const HighlightablePath = styled.path.attrs((props) => ({
  ...props,
}))`
  fill: var(--apollon-gray-variant);
  stroke: var(--apollon-gray-variant);
  :hover {
    fill: var(--apollon-primary);
    stroke: var(--apollon-primary);
  }
  :active {
    fill: var(--apollon-primary);
    stroke: var(--apollon-primary);
  }
`;

const initialState = {};

type StateProps = {
  hovered: boolean;
  selected: boolean;
};

type DispatchProps = {
  updateStart: AsyncDispatch<typeof UMLElementRepository.updateStart>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
  }),
  {
    updateStart: UMLElementRepository.updateStart,
  },
);

export const updatable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
  class Updatable extends Component<Props, State> {
    state = initialState;

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('dblclick', this.update);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('dblclick', this.update);
    }

    render() {
      const { updateStart, hovered, selected, ...props } = this.props;
      return (
        <WrappedComponent {...props}>
          <svg y={-30} style={{ display: '' }}>
            <HighlightablePath
              transform="translate(0px, -30px)"
              height={20}
              width={20}
              d="M16.002 3.5C15.8288 3.5 15.6574 3.5341 15.4975 3.60035C15.3375 3.66661 15.1922 3.76371 15.0697 3.88613L13.8967 5.05922L15.7611 6.92366L16.9342 5.75057C17.0566 5.62815 17.1537 5.48281 17.22 5.32286C17.2862 5.16291 17.3203 4.99148 17.3203 4.81835C17.3203 4.64522 17.2862 4.47379 17.22 4.31384C17.1537 4.15389 17.0566 4.00856 16.9342 3.88613C16.8118 3.76371 16.6664 3.66661 16.5065 3.60035C16.3465 3.5341 16.1751 3.5 16.002 3.5ZM14.7004 7.98432L12.836 6.11988L5.3384 13.6175L4.63924 16.1811L7.20284 15.4819L14.7004 7.98432ZM14.9234 2.21453C15.2654 2.0729 15.6319 2 16.002 2C16.3721 2 16.7386 2.0729 17.0805 2.21453C17.4224 2.35617 17.7331 2.56377 17.9948 2.82548C18.2565 3.08718 18.4641 3.39788 18.6058 3.73981C18.7474 4.08175 18.8203 4.44824 18.8203 4.81835C18.8203 5.18846 18.7474 5.55495 18.6058 5.89689C18.4641 6.23882 18.2565 6.54952 17.9948 6.81122L8.12266 16.6834C8.03037 16.7757 7.91559 16.8423 7.78967 16.8766L3.76767 17.9736C3.50801 18.0444 3.23031 17.9706 3.04 17.7803C2.84969 17.59 2.77594 17.3123 2.84676 17.0526L3.94367 13.0306C3.97801 12.9047 4.04462 12.7899 4.13691 12.6977L14.0091 2.82548C14.2708 2.56377 14.5815 2.35617 14.9234 2.21453Z"
              onClick={() => this.update()}
            />
          </svg>
        </WrappedComponent>
      );
    }

    private update = () => {
      this.props.updateStart(this.props.id);
    };
  }

  return enhance(Updatable);
};
