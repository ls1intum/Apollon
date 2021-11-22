import React, { Component, ComponentType, createRef, RefObject } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
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

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
  getChildren: UMLElementRepository.getChildren as any as AsyncDispatch<typeof UMLElementRepository.getChildren>,
  assessNext:
    (current: IUMLElement): AsyncAction =>
    (dispatch, getState) => {
      const { elements } = getState();
      const children = dispatch(UMLElementRepository.getChildren(current.id));
      const last = children.length ? children[children.length - 1] : current;
      const index = Object.keys(elements).indexOf(last.id) + 1;
      const next = Object.keys(elements)[index % Object.keys(elements).length];

      dispatch(UMLElementRepository.updateEnd(current.id));
      dispatch(UMLElementRepository.deselect(current.id));
      dispatch(UMLElementRepository.updateStart(next));
      dispatch(UMLElementRepository.select(next));
    },
});

class AssessmentComponent extends Component<Props, State> {
  state = getInitialState(this.props);
  container: RefObject<HTMLDivElement> = createRef();

  componentDidMount() {
    this.setFocus();
  }

  componentDidUpdate(props: Props) {
    if (props.element !== this.props.element) {
      this.setState(getInitialState(this.props), this.setFocus);
    }
  }

  render() {
    const { elements } = this.state;

    return (
      <div ref={this.container} id="modeling-assessment-container">
        {elements.map((element) => (
          <AssessmentSection key={element.id} element={element} />
        ))}
        <section>
          <Button block outline color="primary" onClick={this.next} onKeyDown={this.onKey} onKeyUp={this.onKey}>
            Next Assessment
          </Button>
        </section>
      </div>
    );
  }

  private setFocus = () => {
    if (!this.container.current) {
      return;
    }

    const focusable = this.container.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable) {
      focusable.focus();
    }
  };

  private onKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter') {
      if (event.type === 'keydown') {
        event.preventDefault();
      } else {
        this.next();
      }
    }
  };

  private next = () => {
    const { assessNext, element } = this.props;
    assessNext(element);
  };
}

export const Assessment: ConnectedComponent<ComponentType<Props>, OwnProps> = enhance(AssessmentComponent);
