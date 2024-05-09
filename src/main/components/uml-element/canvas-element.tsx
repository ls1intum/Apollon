import React, { Component, ComponentClass, SVGProps } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Components } from '../../packages/components';
import { UMLElementType } from '../../packages/uml-element-type';
import { ApollonView } from '../../services/editor/editor-types';
import { UMLContainer } from '../../services/uml-container/uml-container';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ModelState } from '../store/model-state';
import { withTheme, withThemeProps } from '../theme/styles';
import { UMLElementComponentProps } from './uml-element-component-props';
import { UMLElementSelectorType } from '../../packages/uml-element-selector-type';

const STROKE = 5;

type OwnProps = { child?: ComponentClass<UMLElementComponentProps> } & UMLElementComponentProps &
  SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  remoteSelectors: UMLElementSelectorType[];
  moving: boolean;
  interactive: boolean;
  interactable: boolean;
  element: IUMLElement;
  zoomFactor: number;
  selectionBoxActive: boolean;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps & withThemeProps;

const enhance = compose<ComponentClass<OwnProps>>(
  withTheme,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({
      hovered: state.hovered[0] === props.id,
      selected: state.selected.includes(props.id),
      remoteSelectors: state.remoteSelection[props.id] || [],
      moving: state.moving.includes(props.id),
      interactive: state.interactive.includes(props.id),
      interactable: state.editor.view === ApollonView.Exporting || state.editor.view === ApollonView.Highlight,
      element: state.elements[props.id],
      zoomFactor: state.editor.zoomFactor,
      selectionBoxActive: state.editor.selectionBoxActive,
    }),
    {},
  ),
);

class CanvasElementComponent extends Component<Props> {
  render() {
    const {
      hovered,
      selected,
      remoteSelectors,
      moving,
      interactive,
      interactable,
      element,
      child: ChildComponent,
      children,
      theme,
      zoomFactor: _zoomFactor,
      selectionBoxActive: _selectionBoxActive,
      ...props
    } = this.props;

    let elements = null;
    if (UMLContainer.isUMLContainer(element) && ChildComponent) {
      elements = element.ownedElements.map((id) => <ChildComponent key={id} id={id} />);
    }
    const ElementComponent = Components[element.type as UMLElementType];

    const highlight =
      interactable && interactive
        ? theme.interactive.normal
        : interactable && hovered
          ? theme.interactive.hovered
          : element.highlight
            ? element.highlight
            : element.fillColor
              ? element.fillColor
              : theme.color.background;

    return (
      <svg
        {...props}
        {...element.bounds}
        pointerEvents={moving ? 'none' : undefined}
        fillOpacity={moving ? 0.7 : undefined}
        fill={highlight}
      >
        <ElementComponent fillColor={highlight} element={UMLElementRepository.get(element)}>
          {elements}
        </ElementComponent>
        {children}
        {!interactable && (hovered || selected) && (
          <rect
            x={-STROKE / 2}
            y={-STROKE / 2}
            width={element.bounds.width + STROKE}
            height={element.bounds.height + STROKE}
            fill="none"
            stroke="#0064ff"
            strokeOpacity="0.2"
            strokeWidth={STROKE}
            pointerEvents="none"
          />
        )}
        {remoteSelectors.length > 0 && (
          <g>
            {remoteSelectors.map((selectedBy, index) => {
              const indicatorPosition = 'translate(' + (element.bounds.width + STROKE) + ' ' + index * 32 + ')';
              return (
                <g key={selectedBy.name + '_' + selectedBy.color} id={selectedBy.name + '_' + selectedBy.color}>
                  <rect
                    x={-STROKE / 2}
                    y={-STROKE / 2}
                    width={element.bounds.width + STROKE}
                    height={element.bounds.height + STROKE}
                    fill="none"
                    stroke={selectedBy.color}
                    strokeOpacity="0.2"
                    strokeWidth={STROKE}
                    pointerEvents="none"
                  />

                  <g transform={indicatorPosition} pointerEvents="none">
                    <rect
                      fillOpacity="0.2"
                      rx="10"
                      x="-40"
                      y="-20"
                      width="85px"
                      height="30px"
                      fill={selectedBy.color}
                    />
                    <text>
                      <tspan textAnchor="middle">
                        {selectedBy.name.length < 8 ? selectedBy.name : selectedBy.name.substring(0, 6) + '..'}
                      </tspan>
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    );
  }
}

export const CanvasElement = enhance(CanvasElementComponent);
