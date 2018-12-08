import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ElementSelection } from './../../gui/types';
import { UUID } from '../../core/utils';

export class SelectionListener extends Component<Props> {
  componentDidUpdate({ elements }: Props) {
    const prevSelection = Object.keys(elements).filter(
      k => elements[k].selected
    );
    const currentSelection = Object.keys(this.props.elements).filter(
      k => this.props.elements[k].selected
    );

    if (JSON.stringify(prevSelection) === JSON.stringify(currentSelection))
      return;

    const selection: ElementSelection = {
      entityIds: currentSelection.filter(s =>
        this.props.entities.includes(s)
      ) as UUID[],
      relationshipIds: currentSelection.filter(s =>
        this.props.relationships.includes(s)
      ) as UUID[],
    };
    this.props.subscribers.forEach(subscriber => {
      subscriber(selection);
    });
  }

  render() {
    return <>{this.props.children}</>;
  }
}

interface OwnProps {
  children: React.ReactChild;
  subscribers: Array<(selection: ElementSelection) => void>;
}

interface StateProps {
  elements: any;
  entities: string[];
  relationships: string[];
}

type Props = OwnProps & StateProps;

const mapStateToProps = (state: any) => ({
  elements: state.elements,
  entities: Object.keys(state.entities.byId),
  relationships: Object.keys(state.relationships.byId),
});

export default connect<StateProps, {}, OwnProps, {}>(mapStateToProps)(
  SelectionListener
);
