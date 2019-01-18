import React, { Component, ComponentClass, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
import throttled from 'lodash/throttle';
import isEqual from 'lodash/isEqual';
import { Styles as Theme } from './../Theme';
import { ThemeProvider } from 'styled-components';
import {
  ApollonMode,
  EditorMode,
  InteractiveElementsMode,
} from './../../services/EditorService';
import Element from './../../domain/Element';
import { UUID } from './../../domain/utils/uuid';
import { ElementRepository } from './../../domain/Element';

import { State as ReduxState } from './../Store';
import {
  getAllInteractiveElementIds,
  toggleInteractiveElements,
} from './../../services/redux';
import Container from './../../domain/Container';

import ResizeHandler, { Direction } from './ResizeHandler';
import Port from './Port';
import Droppable from './Droppable';

import * as Plugins from './../../domain/plugins';
import { StyledContainer } from './styles';
import { PopupContext } from '../Popups/PopupLayer';

import hoverable from './Hoverable';
import selectable from './Selectable';

export class LayoutedElement extends Component<Props, State> {
  state: State = {
    element: this.props.getById(this.props.element),
    hover: false,
    selected: false,
    moving: false,
    resizing: false,
    // bounds: { ...this.props.element.bounds },
    features: this.getFeatures(this.props),
  };

  reference: RefObject<SVGSVGElement> = React.createRef();

  componentDidMount() {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.props.container.current &&
      this.props.container.current.addEventListener('mouseup', this.unselect);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.props.container.current &&
      this.props.container.current.removeEventListener(
        'mouseup',
        this.unselect
      );
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: State) {
    if (this.props.editorMode !== prevProps.editorMode) {
      this.setState({ features: this.getFeatures(this.props) });
    }
    if (this.props.hover !== this.state.hover) {
      this.setState({ hover: !!this.props.hover });
    }
    if (this.props.selected !== this.state.selected) {
      this.setState({ selected: !!this.props.selected });
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);
  }

  private getFeatures(props: Readonly<Props>) {
    return {
      elementIsHoverable: props.apollonMode !== ApollonMode.ReadOnly,
      elementIsSelectable: props.editorMode === EditorMode.ModelingView,

      elementIsResizable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
      elementIsMovable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
      elementIsInteractable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.InteractiveElementsView,
      elementIsEditable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
      elementHasPorts:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
    };
  }

  // private onMouseOver = (event: React.MouseEvent) => {
  //   event.stopPropagation();
  //   this.setState({ hover: true });
  //   console.log('LayoutedElement onMouseOver');
  // };

  // private onMouseLeave = (event: React.MouseEvent) => {
  //   this.setState({ hover: false });
  //   console.log('LayoutedElement onMouseLeave');
  // };

  private onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    this.toggleEntityInteractiveElement();
  };

  private onMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    const bounds = event.currentTarget.firstElementChild!.getBoundingClientRect();
    const element: Element = {
      ...this.state.element,
      // selected: event.shiftKey ? !this.state.selected : true,
    };

    let x = event.clientX - bounds.left;
    let y = event.clientY - bounds.top;

    // let owner = this.state.element.owner;
    // while (owner) {
    //   x += owner.bounds.x;
    //   y += owner.bounds.y;
    //   owner = owner.owner;
    // }

    this.setState({
      // selected: element.selected,
      moving: this.state.features.elementIsMovable,
      offset: { x, y },
    });
    this.props.update(element);
  };

  private onMouseMove = (event: MouseEvent) => {
    if (
      this.props.editorMode !== EditorMode.ModelingView ||
      this.props.apollonMode === ApollonMode.ReadOnly
    )
      return;
    if (this.state.moving && this.state.offset) {
      const { bounds } = this.state.element;
      let x = event.layerX - this.state.offset.x;
      let y = event.layerY - this.state.offset.y;

      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
      if (bounds.x === x && bounds.y == y) return;

      const element: Element = {
        ...this.state.element,
        bounds: { ...bounds, x, y },
      };
      this.setState({ element });
      this.throttled_update(element);
    }
    if (this.state.resizing) {
      const { offset } = this.state;
      const { bounds } = this.state.element;
      let width = event.layerX - bounds.x;
      let height = event.layerY - bounds.y;

      if (offset) {
        width -= offset.x;
        height -= offset.y;
      }

      width = Math.round(width / 10) * 10;
      height = Math.round(height / 10) * 10;

      const element: Element = {
        ...this.state.element,
        bounds: { ...bounds, width, height },
      };
      this.setState({ element });
      this.throttled_update(element);
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    if (!this.state.moving && !this.state.resizing) return;
    this.setState({
      moving: false,
      resizing: false,
      offset: { x: 0, y: 0 },
    });
  };

  private unselect = (event: MouseEvent) => {
    // if (!this.state.selected || this.state.hover || event.shiftKey) return;
    // const element: Element = {
    //   ...this.state.element,
    //   selected: false,
    // };
    // this.setState({
    //   selected: element.selected,
    // });
    // this.props.update(element);
  };

  private startResize = (direction: Direction) => (event: React.MouseEvent) => {
    event.stopPropagation();

    let x = 0;
    let y = 0;

    // let owner = this.state.element.owner;
    // while (owner) {
    //   x += owner.bounds.x;
    //   y += owner.bounds.y;
    //   owner = owner.owner;
    // }

    this.setState({
      selected: true,
      resizing: true,
      direction: direction,
      offset: { x, y },
    });
  };

  private throttled_update = throttled(this.props.update, 100);

  toggleEntityInteractiveElement = () => {
    const { element, interactiveElementIds } = this.props;

    const interactiveMemberIdsOfEntity = [
      // ...entity.attributes.map(attr => attr.id),
      // ...entity.methods.map(method => method.id),
    ].filter(id => interactiveElementIds.has(id));

    this.props.onToggleInteractiveElements(
      element,
      ...interactiveMemberIdsOfEntity
    );
  };

  render() { console.log('render LayoutedElement', this.props.selected, this.state.selected);
    const {
      editorMode,
      interactiveElementsMode,
      interactiveElementIds,
    } = this.props;
    const { element } = this.state;

    const { width, height } = element.bounds;

    const { features } = this.state;

    const Component = (Plugins as any)[`${element.kind}Component`];

    return (
      // <Droppable element={element} container={this.props.container}>
      //   <PopupContext.Consumer>
      //     {context =>
      //       context && (
              <StyledContainer
                ref={this.reference}
                {...element.bounds}
                onMouseOver={this.props.onMouseOver}
                onMouseOut={this.props.onMouseOut}
                onMouseDown={this.props.onMouseDown}
                onMouseUp={this.props.onMouseUp}
                // onMouseDown={
                //   (features.elementIsSelectable && this.onMouseDown) ||
                //   undefined
                // }
                onClick={
                  (features.elementIsInteractable && this.onClick) || undefined
                }
                onDoubleClick={
                  // (features.elementIsEditable &&
                  //   ((event: React.MouseEvent) => {
                  //     event.stopPropagation();
                  //     context.showElement(element);
                  //   })) ||
                  undefined
                }
                movable={this.state.features.elementIsMovable}
                moving={this.state.moving}
              >
                {features.elementIsSelectable && this.state.selected && (
                  <g>
                    <rect
                      x={-3}
                      y={-3}
                      width={width + 6}
                      height={height + 6}
                      fill="none"
                      stroke={this.props.theme.highlightColor}
                      strokeWidth={5}
                    />
                  </g>
                )}
                <ThemeProvider
                  theme={{
                    background:
                      editorMode === EditorMode.InteractiveElementsView
                        ? interactiveElementIds.has(element.id)
                          ? this.props.theme.interactiveAreaColor
                          : this.state.hover
                          ? this.props.theme.interactiveAreaHoverColor
                          : undefined
                        : undefined,
                  }}
                >
                  {(!(
                    editorMode === EditorMode.InteractiveElementsView &&
                    interactiveElementsMode ===
                      InteractiveElementsMode.Hidden &&
                    interactiveElementIds.has(element.id)
                  ) && (
                    <Component element={element}>
                      {'ownedElements' in element &&
                        (element as Container).ownedElements.map(
                          (child: string) => {
                            return (
                              <ComposeLayoutedElement
                                key={child}
                                element={child}
                                container={this.props.container}
                              />
                            );
                          }
                        )}
                    </Component>
                  )) || <></>}
                </ThemeProvider>
                {features.elementIsResizable && this.state.selected && (
                  <g transform="translate(-9, -9)">
                    <ResizeHandler
                      direction={Direction.SE}
                      onMouseDown={this.startResize(Direction.SE)}
                    />
                  </g>
                )}
                {features.elementHasPorts && (
                  <g>
                    <Port
                      element={element}
                      show={this.state.hover}
                      rectEdge="TOP"
                    />
                    <Port
                      element={element}
                      show={this.state.hover}
                      rectEdge="RIGHT"
                    />
                    <Port
                      element={element}
                      show={this.state.hover}
                      rectEdge="BOTTOM"
                    />
                    <Port
                      element={element}
                      show={this.state.hover}
                      rectEdge="LEFT"
                    />
                  </g>
                )}
              </StyledContainer>
      //       )
      //     }
      //   </PopupContext.Consumer>
      // </Droppable>
    );
  }
}

interface OwnProps {
  onMouseOver?: any;
  onMouseOut?: any;
  onMouseDown?: any;
  onMouseUp?: any;
  hover?: boolean;
  selected?: boolean;
  element: string;
  container: RefObject<HTMLDivElement>;
}

interface StateProps {
  getById: (id: string) => Element;
  editorMode: EditorMode;
  apollonMode: ApollonMode;
  interactiveElementsMode: InteractiveElementsMode;
  interactiveElementIds: ReadonlySet<UUID>;
}

interface DispatchProps {
  update: typeof ElementRepository.update;
  onToggleInteractiveElements: (...ids: UUID[]) => void;
}

interface ThemeProps {
  theme: Theme;
}

type Props = OwnProps & StateProps & ThemeProps & DispatchProps;

interface State {
  element: Element;
  hover: boolean;
  selected: boolean;
  moving: boolean;
  direction?: Direction;
  resizing: boolean;
  // bounds: { x: number; y: number; width: number; height: number };
  offset?: { x: number; y: number };
  features: { [feature: string]: boolean };
}

function mapStateToProps(state: ReduxState): StateProps {
  return {
    getById: ElementRepository.getById(state),
    editorMode: state.editor.editorMode,
    apollonMode: state.editor.mode,
    interactiveElementsMode: state.editor.interactiveMode,
    interactiveElementIds: getAllInteractiveElementIds(state),
  };
}

const ComposeLayoutedElement = compose<ComponentClass<OwnProps>>(
  withTheme,
  connect(
    mapStateToProps,
    {
      update: ElementRepository.update,
      onToggleInteractiveElements: toggleInteractiveElements,
    }
  ),
)(selectable(hoverable(LayoutedElement)));

export default ComposeLayoutedElement;
