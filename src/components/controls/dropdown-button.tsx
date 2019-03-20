import styled from 'styled-components';

const Button = styled.button`
  border-radius: 0;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  overflow: visible;
  text-transform: none;
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  &:focus {
    // outline: 1px dotted;
    // outline: 5px auto -webkit-focus-ring-color;
  }
  &:active {
    color: inherit;
  }
  &:not(:disabled) {
    cursor: pointer;
  }
  &::-moz-focus-inner {
    padding: 0;
    border-style: none;
  }
`;

export const DropdownButton = styled(Button)`
  font-weight: 400;
  white-space: nowrap;
  border: 1px solid transparent;
  padding: .375rem .75rem;
  border-radius: .25rem;

  background: white;
  color: #212529;
  border: 1px solid #2a8fbd;
  padding: 0.375rem 0.75rem;
  margin: 0;

  position: relative;
  width: 100%;

  &::after {
    display: inline-block;
    width: 0;
    height: 0;
    margin-left: 0.255em;
    vertical-align: 0.255em;
    content: '';
    border-top: 0.3em solid;
    border-right: 0.3em solid transparent;
    border-bottom: 0;
    border-left: 0.3em solid transparent;
  }
`;
