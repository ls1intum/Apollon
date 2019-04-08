import { styled } from '../../theme/styles';
import { Button } from '../button/button';

export const StyledSwitch = styled.div`
  display: flex;
`;

export type SwitchItemProps = {
  selected?: boolean;
};

export const StyledSwitchItem = styled(Button).attrs<SwitchItemProps>(props => ({
  outline: !props.selected,
}))<SwitchItemProps>`
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  :not(:first-child) {
    margin-left: -1px;
  }

  :not(:first-child):not(:last-child) {
    border-radius: 0;
  }

  :first-child {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  :last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`;
