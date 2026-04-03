/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.config.includeStack = true;

chai.use(sinonChai);

// Match the globals previously provided by legacy Karma test setup.
globalThis.chai = chai;
globalThis.sinon = sinon;

// Common assertion entry points used throughout the test suite.
globalThis.expect = chai.expect;
globalThis.assert = chai.assert;
globalThis.should = chai.should();
