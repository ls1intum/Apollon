import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Grid from './Grid';
import CanvasContext, { CanvasProvider } from './CanvasContext';
import CoordinateSystem from './CoordinateSystem';
import ConnectLayer from '../Connectable/ConnectLayer';
import LayoutedElement from './../LayoutedElement/LayoutedElement';
import LayoutedRelationship from './../LayoutedRelationship';

import RelationshipMarkers from './../../rendering/renderers/svg/defs/RelationshipMarkers';
import Droppable from './../DragDrop/Droppable';
import Diagram from '../../domain/Diagram';

class Canvas extends Component<Props, State> {
  state: State = {
    isMounted: false,
  };
  canvas: RefObject<HTMLDivElement> = createRef();
  coordinateSystem = new CoordinateSystem(
    this.canvas,
    this.props.diagram.bounds.width,
    this.props.diagram.bounds.height
  );

  componentDidMount() {
    this.setState({ isMounted: true }, this.center);
  }

  center = () => {
    const container = this.canvas.current!.parentElement!;
    const { width, height } = container.getBoundingClientRect();
    container.scrollTo(
      this.coordinateSystem.width / 2 - width / 2,
      this.coordinateSystem.height / 2 - height / 2
    );
  };

  render() {
    const { diagram } = this.props;
    const context: CanvasContext = {
      canvas: this.canvas.current!,
      coordinateSystem: this.coordinateSystem,
    };

    return (
      <div ref={this.canvas} tabIndex={0}>
        <CanvasProvider value={context}>
          <Droppable container={this.canvas}>
            <Grid
              grid={10}
              width={diagram.bounds.width}
              height={diagram.bounds.height}
            >
              {this.state.isMounted && (
                <svg width="100%" height="100%">
                  <defs>
                    <RelationshipMarkers />
                    <filter id="highlight" filterUnits="userSpaceOnUse">
                      <feFlood
                        floodColor="#0064ff"
                        floodOpacity="0.2"
                        result="color"
                      />
                      <feMorphology
                        operator="dilate"
                        radius="4"
                        in="SourceAlpha"
                        result="mask"
                      />
                      <feComposite
                        in="color"
                        in2="mask"
                        operator="in"
                        result="outline"
                      />
                      <feBlend in="SourceGraphic" in2="outline" mode="normal" />
                    </filter>
                  </defs>

                  <ConnectLayer>
                    {diagram.ownedElements.map(element => (
                      <LayoutedElement key={element} element={element} />
                    ))}
                    {diagram.ownedRelationships.map(relationship => (
                      <LayoutedRelationship
                        key={relationship}
                        relationship={relationship}
                        container={this.canvas}
                      />
                    ))}
                  </ConnectLayer>
                </svg>
              )}
            </Grid>
          </Droppable>
        </CanvasProvider>
      </div>
    );
  }
}

interface OwnProps {}

interface StateProps {
  diagram: Diagram;
}

interface DispatchProps {}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  isMounted: boolean;
}

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  (state: ReduxState): StateProps => ({
    diagram: state.diagram,
  })
)(Canvas);
