import { styled } from '../theme/styles';
import React, { Component, ComponentType, createRef, ReactNode } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../store/model-state';
import isMobile from 'is-mobile';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';

const grid = 10;
const subdivisions = 5;
const borderWidth = 1;

const StyledEditor = styled.div<{zoomFactor?: number}>`
  display: block;
  width: 100%;
  position: relative;
  min-height: inherit;
  max-height: inherit;
  max-width: inherit;

  overflow: auto;
  -ms-overflow-style: -ms-autohiding-scrollbar;
  border: ${borderWidth}px solid ${(props) => props.theme.color.gray};

  background-position: calc(50% + ${(grid * subdivisions - borderWidth) / 2}px)
    calc(50% + ${(grid * subdivisions - borderWidth) / 2}px);
  background-size:
    ${grid * subdivisions}px ${grid * subdivisions}px,
    ${grid * subdivisions}px ${grid * subdivisions}px,
    ${grid}px ${grid}px,
    ${grid}px ${grid}px;
  background-image: linear-gradient(to right, ${(props) => props.theme.color.grid} 1px, transparent 1px),
    linear-gradient(to bottom, ${(props) => props.theme.color.grid} 1px, transparent 1px),
    linear-gradient(to right, ${(props) => props.theme.color.gray} 1px, transparent 1px),
    linear-gradient(to bottom, ${(props) => props.theme.color.gray} 1px, transparent 1px);
  background-repeat: repeat;
  background-attachment: local;
  //transform: scale(${(props) => props.zoomFactor ?? 1});
`;

type OwnProps = { children: ReactNode };

type StateProps = { moving: string[]; connecting: boolean; reconnecting: boolean, zoomFactor: number };

type DispatchProps = { move: AsyncDispatch<typeof UMLElementRepository.move> };

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state) => ({
    moving: [...state.moving],
    connecting: state.connecting.length > 0,
    reconnecting: Object.keys(state.reconnecting).length > 0,
    zoomFactor: state.editor.zoomFactor
  }),
  {
    move: UMLElementRepository.move,
  },
);

type Props = OwnProps & StateProps & DispatchProps;

const getInitialState = () => {
  return {
    scrollingDisabled: false,
    isMobile: isMobile({ tablet: true }),
  };
};

type State = typeof getInitialState;

const SCROLL_BORDER = 100;
const SCROLL_DISTANCE = 5;

class EditorComponent extends Component<Props, State> {
  state = getInitialState();
  editor = createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if (this.state.isMobile) {
      if (this.editor.current) {
        const { moving, connecting, reconnecting } = this.props;
        const deactivateScroll = moving.length > 0 || connecting || reconnecting;
        // deactivate default scrolling and use custom scrolling
        if (deactivateScroll && !this.state.scrollingDisabled) {
          this.deactivateScrolling(this.editor.current);
        } else if (!deactivateScroll && this.state.scrollingDisabled) {
          this.activateScrolling(this.editor.current);
        }
      }
    }
  }

  render() {
    const { moving, connecting, reconnecting, zoomFactor, ...props } = this.props;
    if (this.state.isMobile) {
      return <StyledEditor ref={this.editor} {...props} onTouchMove={this.customScrolling} zoomFactor={zoomFactor}/>;
    } else {
      return <StyledEditor {...props} zoomFactor={zoomFactor}/>;
    }
  }

  customScrolling = (event: React.TouchEvent) => {
    if (this.editor.current) {
      const clientRect = this.editor.current.getBoundingClientRect();

      const touch = event.touches[event.touches.length - 1];

      // scroll when on the edge of the element
      const scrollHorizontally =
        touch.clientX < clientRect.x + SCROLL_BORDER
          ? -SCROLL_DISTANCE
          : touch.clientX > clientRect.x + clientRect.width - SCROLL_BORDER
          ? SCROLL_DISTANCE
          : 0;
      const scrollVertically =
        touch.clientY < clientRect.y + SCROLL_BORDER
          ? -SCROLL_DISTANCE
          : touch.clientY > clientRect.y + clientRect.height - SCROLL_BORDER
          ? SCROLL_DISTANCE
          : 0;
      this.editor.current.scrollBy(scrollHorizontally, scrollVertically);
      if (this.props.moving) {
        this.props.move({ x: scrollHorizontally, y: scrollVertically }, this.props.moving);
      }
    }
    event.preventDefault();
    event.stopPropagation();
  };

  activateScrolling = (target: HTMLElement) => {
    if (target) {
      // enables default scrolling in editor
      (target as HTMLElement).style.overflow = 'auto';
      // enables pull to refresh
      document.body.style.overflowY = 'auto';
      (target as HTMLElement).style.overscrollBehavior = 'auto';
      this.setState({ scrollingDisabled: false });
    }
  };

  deactivateScrolling = (target: HTMLElement) => {
    if (target) {
      // disables default scrolling in editor
      (target as HTMLElement).style.overflow = 'hidden';
      // disables pull to refresh
      document.body.style.overflowY = 'hidden';
      (target as HTMLElement).style.overscrollBehavior = 'none';
      this.setState({ scrollingDisabled: true });
    }
  };
}

export const Editor: ConnectedComponent<ComponentType<Props>, OwnProps> = enhance(EditorComponent);
