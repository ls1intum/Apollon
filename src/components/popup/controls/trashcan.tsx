import React from 'react';

export class TrashCanIcon extends React.Component<Props> {
  render() {
    const { width, ...props } = this.props;
    const height = width * 1.11827;

    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 28.06329 31.382301" {...props}>
        <g stroke="#000" fill="none" strokeWidth="5.292" strokeLinejoin="round">
          <path
            d="M0 4.824h28.063M8.629 8.288l1.228 20.164M19.597 8.288l-1.228 20.164M14.032 28.648V8.425M24.983 7.336l-2.52 21.499s-.498 1.931-2.116 1.931h-6.253M3.204 7.336l2.52 21.499s.498 1.931 2.116 1.931h6.254M19.165 4.972l.031-1.618s-.252-2.056-2.312-2.685C16.709.615 14.24.616 14.032.616M8.898 4.972l-.031-1.618s.252-2.056 2.312-2.685c.175-.054 2.645-.053 2.853-.053"
            strokeWidth="1.23208344"
          />
        </g>
      </svg>
    );
  }
}

interface Props extends React.SVGProps<SVGSVGElement> {
  width: number;
}
