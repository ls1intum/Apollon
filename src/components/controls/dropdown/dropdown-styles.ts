import { styled } from '../../theme/styles';
import { Button } from '../button/button';

export const StyledDropdown = styled.div`
  position: relative;
`;

export type DropdownItemProps = {};

export const StyledDropdownItem = styled(Button).attrs<DropdownItemProps>({
  block: true,
  color: 'link',
})<DropdownItemProps>`
  color: ${props => props.theme.font.color};
  padding-right: 1.5rem;
  padding-left: 1.5rem;
  text-align: left;

  :hover {
    text-decoration: none;
    background-color: ${props => props.theme.color.lightgray};
  }
`;
