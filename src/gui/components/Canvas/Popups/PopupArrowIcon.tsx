import * as React from "react";

export default class PopupArrowIcon extends React.Component<Props> {
    render() {
        const { width, stroke, fill } = this.props;

        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={width}
                height={width}
                viewBox="0 0 5.2916665 5.2916666"
            >
                <g stroke={stroke} fill={fill} strokeLinejoin="round">
                    <g strokeWidth="5.292">
                        <path
                            d="M107.872-156.206h28.063M116.5-152.742l1.229 20.164M127.469-152.742l-1.228 20.164M121.904-132.382v-20.223M132.855-153.694l-2.52 21.499s-.498 1.931-2.116 1.931h-6.253m-10.89-23.43l2.52 21.499s.498 1.931 2.116 1.931h6.254M127.037-156.058l.031-1.618s-.252-2.056-2.312-2.685c-.175-.054-2.644-.053-2.852-.053m-5.134 4.356l-.031-1.618s.252-2.056 2.312-2.685c.175-.054 2.645-.053 2.853-.053"
                            strokeWidth="1.23208344"
                        />
                    </g>
                    <path
                        d="M4.09.13L1.265 2.533a.15.15 0 0 0 0 .226L4.09 5.161"
                        strokeWidth=".259"
                    />
                </g>
            </svg>
        );
    }
}

interface Props {
    width: number;
    stroke: string;
    fill: string;
}
