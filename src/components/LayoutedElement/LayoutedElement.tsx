import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, {
  OwnProps as ComponentProps,
} from './ElementComponent';
import hoverable from './Hoverable';
import selectable from './Selectable';
import movable from './Movable';
import resizable from './Resizable';
import connectable from './Connectable';
import droppable from './Droppable';
import editable from './Editable';
import interactable from './Interactable';
import { EditorMode, ApollonMode } from '../../services/EditorService';

class LayoutedElement extends Component<Props> {
  component: typeof ElementComponent = this.composeComponent();

  private composeComponent(): typeof ElementComponent {
    const { editorMode, apollonMode } = this.props;
    type DecoratorType = (
      Component: typeof ElementComponent
    ) => React.ComponentClass<ComponentProps>;
    let decorators: DecoratorType[] = [];

    if (apollonMode === ApollonMode.ReadOnly) {
      decorators = [selectable];
    } else if (editorMode === EditorMode.InteractiveElementsView) {
      decorators = [interactable];
    } else {
      const features = this.props.getById(this.props.element)
        .constructor as any;
      if (features.isEditable) decorators.push(editable);
      if (features.isDroppable) decorators.push(droppable);
      if (features.isConnectable) decorators.push(connectable);
      if (features.isResizable) decorators.push(resizable);
      if (features.isMovable) decorators.push(movable);
      if (features.isSelectable) decorators.push(selectable);
      if (features.isHoverable) decorators.push(hoverable);
    }

    return compose<typeof ElementComponent>(...decorators)(ElementComponent);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.editorMode !== this.props.editorMode) {
      this.component = this.composeComponent();
      this.forceUpdate();
    }
  }

  render() {
    const Component = this.component;
    const element: Element = this.props.getById(this.props.element);
    return <Component element={element} />;
  }
}

interface OwnProps {
  element: string;
}

interface StateProps {
  getById: (id: string) => Element;
  editorMode: EditorMode;
  apollonMode: ApollonMode;
}

type Props = OwnProps & StateProps;

const mapStateToProps = (state: ReduxState): StateProps => ({
  getById: ElementRepository.getById(state),
  editorMode: state.editor.editorMode,
  apollonMode: state.editor.mode,
});

export default connect(mapStateToProps)(LayoutedElement);
