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
import {UMLElementState} from '../../services/uml-element/uml-element-types';

const minScale: number = 0.5;
const maxScale: number = 5.0;

const grid: number = 10;
const subdivisions: number = 5;
const borderWidth: number = 1;

const StyledEditor = styled.div<{ zoomFactor: number }>`
  display: block;
  overflow: auto;
  
  position: relative;
  min-height: inherit;
  max-height: inherit;

  width: ${(props) => clamp(100 / props.zoomFactor, 100, 100 / minScale)}%;
  height: ${(props) => clamp(100 / props.zoomFactor, 100, 100 / minScale)}%;

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
  transition: transform 500ms, width 500ms, height 500ms;
  transform-origin: top left;
  transform: scale(${(props) => props.zoomFactor ?? 1});
`;

type OwnProps = { children: ReactNode };

type StateProps = { moving: string[]; connecting: boolean; reconnecting: boolean; zoomFactor: number; elements: UMLElementState; };

type DispatchProps = {
  move: AsyncDispatch<typeof UMLElementRepository.move>;
  changeZoomFactor: typeof EditorRepository.changeZoomFactor;
};

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state) => ({
    moving: [...state.moving],
    connecting: state.connecting.length > 0,
    reconnecting: Object.keys(state.reconnecting).length > 0,
    zoomFactor: state.editor.zoomFactor,
    elements: state.elements
  }),
  {
    move: UMLElementRepository.move,
    changeZoomFactor: EditorRepository.changeZoomFactor,
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
    // const { zoomFactor = 1 } = this.props;

    window.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey) {
          event.preventDefault();
          // this.props.changeZoomFactor(clamp(zoomFactor - event.deltaY * 0.1, minScale, maxScale));
        }
      },
      { passive: false },
    );

    /*
    window.addEventListener('gesturestart', (event) => {
      event.preventDefault();

      this.setState({
        ...this.state,
        gestureStartZoomFactor: zoomFactor,
      });
    });

    window.addEventListener('gesturechange', (event) => {
      event.preventDefault();

      const { zoomFactor = 1, } = this.props;

      const relativeCursorOffsetX = (event as any).clientX - this.editor.current!.getBoundingClientRect().x;
      const relativeCursorOffsetY = (event as any).clientY - this.editor.current!.getBoundingClientRect().y;

      const newZoomFactor = clamp(this.state.gestureStartZoomFactor * (event as any).scale, minScale, maxScale);

      this.zoomContainer.current?.scrollBy({
        left: newZoomFactor * relativeCursorOffsetX - zoomFactor * relativeCursorOffsetX ,
        top: newZoomFactor * relativeCursorOffsetY - zoomFactor * relativeCursorOffsetY,
        behavior: 'smooth'
      });

      this.props.changeZoomFactor(newZoomFactor);
    });

    window.addEventListener('gestureend', function (event) {
      event.preventDefault();
    });
    */
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
    const { moving, connecting, reconnecting, zoomFactor = 1.0, elements, ...props } = this.props;

    if (this.state.isMobile) {
      return (
        <div ref={this.zoomContainer} style={{ height: '100%', width: '100%', overflow: zoomFactor > 1.0 ? 'auto' : 'hidden' }}>
          <StyledEditor ref={this.editor} {...props} onTouchMove={this.customScrolling} zoomFactor={zoomFactor}/>
          <ZoomPane
            value={zoomFactor}
            onChange={(zoomFactor) => this.props.changeZoomFactor(zoomFactor)}
            min={minScale}
            max={maxScale}
            step={0.2}
          />
        </div>
      );
    } else {
      return (
        <div ref={this.zoomContainer} style={{ height: '100%', width: '100%', overflow: zoomFactor > 1.0 ? 'auto' : 'hidden' }}>
          <StyledEditor ref={this.editor} {...props} zoomFactor={zoomFactor}/>
          <ZoomPane
            value={zoomFactor}
            onChange={(zoomFactor) => this.props.changeZoomFactor(zoomFactor)}
            min={minScale}
            max={maxScale}
            step={0.2}
          />
        </div>
      );
    }
  }

  customScrolling = (event: React.TouchEvent) => {
    const { zoomFactor = 1 } = this.props;

    if (this.editor.current) {
      const clientRect = this.editor.current.getBoundingClientRect();

      const touch = event.touches[event.touches.length - 1];

      // scroll when on the edge of the element
      const scrollHorizontally =
        touch.clientX * zoomFactor < clientRect.x + SCROLL_BORDER
          ? -SCROLL_DISTANCE
          : touch.clientX * zoomFactor > clientRect.x + clientRect.width - SCROLL_BORDER
          ? SCROLL_DISTANCE
          : 0;
      const scrollVertically =
        touch.clientY * zoomFactor < clientRect.y + SCROLL_BORDER
          ? -SCROLL_DISTANCE
          : touch.clientY * zoomFactor > clientRect.y + clientRect.height - SCROLL_BORDER
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
