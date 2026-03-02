#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./src/components/App.js";

const app = render(React.createElement(App));
app.waitUntilExit().then(() => {
    console.clear();
});
