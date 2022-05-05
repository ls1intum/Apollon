import { styled } from '../../theme/styles';
import { Button } from '../button/button';

export const StyledDropdown = styled.div``;

export type DropdownItemProps = {};

export const StyledDropdownItem = styled(Button).attrs<DropdownItemProps>({
  block: true,
  color: 'link',
})<DropdownItemProps>`
  color: ${(props) => props.theme.font.color};
  padding-right: 1.5em;
  padding-left: 1.5em;
  text-align: left;

  :hover {
    text-decoration: none;
    background-color: ${(props) => props.theme.color.gray};
  }
`;
