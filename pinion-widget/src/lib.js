import React from 'react';
import ReactDOM from 'react-dom';
import {PinionWidget} from './pinion-widget'

export const setup = (element, config) => {
    ReactDOM.render(<PinionWidget {...config} />, element);
}

