import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncAction, AsyncDispatch } from '../../utils/actions/actions';
import { Button } from '../controls/button/button';
import { ModelState } from '../store/model-state';
import { AssessmentSection } from './assessment-section';

type OwnProps = {
  element: IUMLElement;
};

type StateProps = {};

type DispatchProps = {
  getChildren: AsyncDispatch<typeof UMLElementRepository.getChildren>;
  assessNext: AsyncDispatch<(current: IUMLElement) => AsyncAction>;
};

type Props = OwnProps & StateProps & DispatchProps;

const getInitialState = ({ element, getChildren }: Props) => ({
  elements: getChildren(element.id),
});

type State = ReturnType<typeof getInitialState>;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  null,
  {
    getChildren: (UMLElementRepository.getChildren as any) as AsyncDispatch<typeof UMLElementRepository.getChildren>,
    assessNext: (current: IUMLElement): AsyncAction => (dispatch, getState) => {
      const { elements } = getState();
      const children = dispatch(UMLElementRepository.getChildren(current.id));
      const last = children.length ? children[children.length - 1] : current;
      const index = Object.keys(elements).indexOf(last.id) + 1;
      const next = Object.keys(elements)[index % Object.keys(elements).length];

      dispatch(UMLElementRepository.updateEnd(current.id));
      dispatch(UMLElementRepository.updateStart(next));
    },
  },
);

class AssessmentComponent extends Component<Props, State> {
  state = getInitialState(this.props);

  componentDidUpdate(props: Props) {
    if (props.element !== this.props.element) {
      this.setState(getInitialState(this.props));
    }
  }

  render() {
    const { elements } = this.state;

    return (
      <div>
        {elements.map((element, i) => (
          <AssessmentSection key={element.id} element={element} />
        ))}
        <section>
          <Button block={true} outline={true} color="primary" onClick={this.next}>
            Next Assessment
          </Button>
        </section>
      </div>
    );
  }

  private next = () => {
    const { assessNext, element } = this.props;
    assessNext(element);
  };
}

export const Assessment = enhance(AssessmentComponent);
