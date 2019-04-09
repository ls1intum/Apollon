import { styled } from '../../theme/styles';
import { Button } from '../button/button';

export const DropdownButton = styled(Button).attrs({
  block: true,
})`
  ::after {
    border-top: 0.3em solid;
    border-right: 0.3em solid transparent;
    border-bottom: 0;
    border-left: 0.3em solid transparent;
    content: '';
    display: inline-block;
    height: 0;
    margin-left: 0.255em;
    vertical-align: 0.255em;
    width: 0;
  }
`;
