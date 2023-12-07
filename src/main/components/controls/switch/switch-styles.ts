import { styled } from '../../theme/styles';
import { Button } from '../button/button';

export const StyledSwitch = styled.div`
  display: flex;
  min-height: 1.9rem;
`;

export type SwitchItemProps = {
  selected?: boolean;
};

export const StyledSwitchItem = styled(Button).attrs<SwitchItemProps>((props) => ({
  outline: !props.selected,
}))<SwitchItemProps>`
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: center;

  :not(:first-child) {
    margin-left: -1px;
  }

  :first-child {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  :last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  :not(:first-child):not(:last-child) {
    border-radius: 0;
  }
`;
