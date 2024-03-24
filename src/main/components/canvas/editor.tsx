import { styled } from '../theme/styles';
import React, { Component, ComponentType, createRef, ReactNode } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../store/model-state';
import isMobile from 'is-mobile';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { EditorRepository } from '../../services/editor/editor-repository';
import { clamp } from '../../utils/clamp';
import { ZoomPane } from './zoom-pane';

const minScale: number = 0.5;
const maxScale: number = 5.0;

const grid: number = 10;
const subdivisions: number = 5;
const borderWidth: number = 1;

const StyledEditor = styled.div<{ scale: number }>`
  display: block;
  overflow: auto;

  position: relative;
  min-height: inherit;
  max-height: inherit;

  width: ${(props) => clamp(100 / props.scale, 100, 100 / minScale)}%;
  height: ${(props) => clamp(100 / props.scale, 100, 100 / minScale)}%;

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
  transition:
    transform 500ms,
    width 500ms,
    height 500ms;
  transform-origin: top left;
  transform: scale(${(props) => props.scale ?? 1});
`;

type OwnProps = { children: ReactNode };

type StateProps = { moving: string[]; connecting: boolean; reconnecting: boolean; scale: number };

type DispatchProps = {
  move: AsyncDispatch<typeof UMLElementRepository.move>;
  setZoomFactor: typeof EditorRepository.setZoomFactor;
};

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state) => ({
    moving: [...state.moving],
    connecting: state.connecting.length > 0,
    reconnecting: Object.keys(state.reconnecting).length > 0,
    scale: state.editor.zoomFactor,
  }),
  {
    move: UMLElementRepository.move,
    setZoomFactor: EditorRepository.setZoomFactor,
  },
);

type Props = OwnProps & StateProps & DispatchProps;

const getInitialState = () => {
  return {
    scrollingDisabled: false,
    gestureStartZoomFactor: 1.0 as number,
    isMobile: isMobile({ tablet: true }),
  };
};

type State = typeof getInitialState;

const SCROLL_BORDER = 100;
const SCROLL_DISTANCE = 5;

class EditorComponent extends Component<Props, State> {
  state = getInitialState();
  editor = createRef<HTMLDivElement>();
  zoomContainer = createRef<HTMLDivElement>();

  componentDidMount() {
    window.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey) {
          event.preventDefault();
        }
      },
      { passive: false },
    );
  }

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
    const { moving, connecting, reconnecting, scale = 1.0, ...props } = this.props;

    if (this.state.isMobile) {
      return (
        <div ref={this.zoomContainer} style={{ width: '100%', overflow: scale > 1.0 ? 'auto' : 'hidden' }}>
          <StyledEditor ref={this.editor} {...props} onTouchMove={this.customScrolling} scale={scale} />
          <ZoomPane
            value={scale}
            onChange={(zoomFactor) => this.props.setZoomFactor(zoomFactor)}
            min={minScale}
            max={maxScale}
            step={0.2}
          />
        </div>
      );
    } else {
      return (
        <div ref={this.zoomContainer} style={{ width: '100%', overflow: scale > 1.0 ? 'auto' : 'hidden' }}>
          <StyledEditor ref={this.editor} {...props} scale={scale} />
          <ZoomPane
            value={scale}
            onChange={(zoomFactor) => this.props.setZoomFactor(zoomFactor)}
            min={minScale}
            max={maxScale}
            step={0.2}
          />
        </div>
      );
    }
  }

  customScrolling = (event: React.TouchEvent) => {
    const { scale = 1 } = this.props;

    if (this.editor.current) {
      const clientRect = this.editor.current.getBoundingClientRect();

      const touch = event.touches[event.touches.length - 1];

      // scroll when on the edge of the element
      const scrollHorizontally =
        touch.clientX * scale < clientRect.x + SCROLL_BORDER
          ? -SCROLL_DISTANCE
          : touch.clientX * scale > clientRect.x + clientRect.width - SCROLL_BORDER
            ? SCROLL_DISTANCE
            : 0;
      const scrollVertically =
        touch.clientY * scale < clientRect.y + SCROLL_BORDER
          ? -SCROLL_DISTANCE
          : touch.clientY * scale > clientRect.y + clientRect.height - SCROLL_BORDER
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
