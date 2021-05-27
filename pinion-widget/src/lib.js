import React from 'react';
import ReactDOM from 'react-dom';
import {PinionWidget} from './pinion-widget'

export const setup = (element, config) => {
    console.log("Setting up pinion!");
    console.log(PinionWidget);
    ReactDOM.render(<PinionWidget {...config} />, element);
}

