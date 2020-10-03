import { styled } from '../theme/styles';
import React, { Component, createRef, ReactNode } from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../store/model-state';
import { EditorRepository } from '../../services/editor/editor-repository';

const grid = 10;
const color1 = '#e5e5e5';
const color2 = '#f5f5f5';
const subdivisions = 5;

const StyledEditor = styled.div`
  display: block;
  width: 100%;
  position: relative;
  min-height: inherit;
  max-height: inherit;
  max-width: inherit;

  overflow: auto;
  -ms-overflow-style: -ms-autohiding-scrollbar;
  border: 1px solid ${(props) => props.theme.color.gray500};

  background-position: calc(50% + ${(grid * subdivisions) / 2}px) calc(50% + ${(grid * subdivisions) / 2}px);
  background-size: ${grid * subdivisions}px ${grid * subdivisions}px, ${grid * subdivisions}px ${grid * subdivisions}px,
    ${grid}px ${grid}px, ${grid}px ${grid}px;
  background-image: linear-gradient(to right, ${color1} 1px, transparent 1px),
    linear-gradient(to bottom, ${color1} 1px, transparent 1px),
    linear-gradient(to right, ${color2} 1px, transparent 1px),
    linear-gradient(to bottom, ${color2} 1px, transparent 1px);
  background-repeat: repeat;
  background-attachment: local;
`;

type OwnProps = { children: ReactNode };

type StateProps = { moving: boolean; connecting: boolean; reconnecting: boolean };

type DispatchProps = {};

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state) => ({
    moving: state.moving.length > 0,
    connecting: state.connecting.length > 0,
    reconnecting: Object.keys(state.reconnecting).length > 0,
  }),
  {
    changeView: EditorRepository.changeView,
  },
);

type Props = OwnProps & StateProps & DispatchProps;

const getInitialState = () => {
  return {
    scrollingDisabled: false,
  };
};

type State = typeof getInitialState;

const SCROLL_BORDER = 100;

class EditorComponent extends Component<Props, State> {
  state = getInitialState();
  editor = createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if (this.editor.current) {
      const { moving, connecting, reconnecting } = this.props;
      const deactivateScroll = moving || connecting || reconnecting;
      // deactivate default scrolling and use custom scrolling
      if (deactivateScroll && !this.state.scrollingDisabled) {
        this.deactivateScrolling(this.editor.current);
      } else if (!deactivateScroll && this.state.scrollingDisabled) {
        this.activateScrolling(this.editor.current);
      }
    }
  }

  render() {
    return <StyledEditor ref={this.editor} {...this.props} onTouchMove={this.customScrolling} />;
  }

  customScrolling = (event: React.TouchEvent) => {
    const target = event.currentTarget as HTMLElement;
    if (target) {
      const clientRect = target.getBoundingClientRect();

      const scrollDistance = 5;

      const touch = event.touches[event.touches.length - 1];

      // scroll when on the edge of the element
      const scrollHorizontally =
        touch.clientX < clientRect.x + SCROLL_BORDER
          ? -scrollDistance
          : touch.clientX > clientRect.x + clientRect.width - SCROLL_BORDER
          ? scrollDistance
          : 0;
      const scrollVertically =
        touch.clientY < clientRect.y + SCROLL_BORDER
          ? -scrollDistance
          : touch.clientY > clientRect.y + clientRect.height - SCROLL_BORDER
          ? scrollDistance
          : 0;
      target.scrollBy(scrollHorizontally, scrollVertically);
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

export const Editor = enhance(EditorComponent);
