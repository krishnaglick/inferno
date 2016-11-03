import {
	isArray,
	isStringOrNumber,
	isNullOrUndef,
	isInvalid,
	isStatefulComponent,
	isNumber,
	isTrue
} from './../shared';
import { isUnitlessNumber } from '../DOM/constants';
import {
	toHyphenCase,
	escapeText,
	escapeAttr,
	isVoidElement
} from './utils';
import {
	ELEMENT,
	COMPONENT,
	PLACEHOLDER,
	OPT_ELEMENT,
	FRAGMENT,
	TEXT
} from '../core/NodeTypes';
import { default as Inferno } from 'inferno';
const { convertVOptElementToVElement } = Inferno;

function renderComponentToString(vComponent, isRoot, context) {
	const type = vComponent.type;
	const props = vComponent.props;

	if (isStatefulComponent(vComponent)) {
		const instance = new type(props);
		const childContext = instance.getChildContext();

		if (!isNullOrUndef(childContext)) {
			context = Object.assign({}, context, childContext);
		}
		instance.context = context;
		// Block setting state - we should render only once, using latest state
		instance._pendingSetState = true;
		instance.componentWillMount();
		const node = instance.render(props, vComponent.context);

		instance._pendingSetState = false;
		return renderInputToString(node, context, isRoot);
	} else {
		return renderInputToString(type(props, context), context, isRoot);
	}
}

function renderChildren(children, context): string {
	if (children && isArray(children)) {
		const childrenResult: Array<string> = [];
		let insertComment = false;

		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const isText = isStringOrNumber(child);

			if (isInvalid(child)) {
				childrenResult.push('<!--!-->');
			} else if (isText) {
				if (insertComment) {
					childrenResult.push('<!---->');
				}
				if (isText) {
					childrenResult.push(escapeText(child));
				}
				insertComment = true;
			} else if (isArray(child)) {
				childrenResult.push('<!---->');
				childrenResult.push(renderChildren(child, context));
				childrenResult.push('<!--!-->');
				insertComment = true;
			} else {
				insertComment = false;
				childrenResult.push(renderInputToString(child, context, false));
			}
		}
		return childrenResult.join('');
	} else if (!isInvalid(children)) {
		if (isStringOrNumber(children)) {
			return escapeText(children);
		} else {
			return renderInputToString(children, context, false) || '';
		}
	}
	return '';
}

function renderStyleToString(style) {
	if (isStringOrNumber(style)) {
		return style;
	} else {
		const styles: Array<string> = [];
		const keys = Object.keys(style);

		for (let i = 0; i < keys.length; i++) {
			const styleName = keys[i];
			const value = style[styleName];
			const px = isNumber(value) && !isUnitlessNumber[styleName] ? 'px' : '';

			if (!isNullOrUndef(value)) {
				styles.push(`${ toHyphenCase(styleName) }:${ escapeAttr(value) }${ px };`);
			}
		}
		return styles.join('');
	}
}

function renderVElementToString(vElement, isRoot, context) {
	const tag = vElement.tag;
	const outputProps: Array<string> = [];
	const props = vElement.props;
	let propsKeys = (props && Object.keys(props)) || [];
	let html = '';

	for (let i = 0; i < propsKeys.length; i++) {
		const prop = propsKeys[i];
		const value = props[prop];

		if (prop === 'dangerouslySetInnerHTML') {
			html = value.__html;
		} else if (prop === 'style') {
			outputProps.push('style="' + renderStyleToString(props.style) + '"');
		} else if (prop === 'className') {
			outputProps.push('class="' + value + '"');
		} else {
			if (isStringOrNumber(value)) {
				outputProps.push(escapeAttr(prop) + '="' + escapeAttr(value) + '"');
			} else if (isTrue(value)) {
				outputProps.push(escapeAttr(prop));
			}
		}
	}
	if (isRoot) {
		outputProps.push('data-infernoroot');
	}
	if (isVoidElement(tag)) {
		return `<${ tag }${ outputProps.length > 0 ? ' ' + outputProps.join(' ') : '' }>`;
	} else {
		return `<${ tag }${ outputProps.length > 0 ? ' ' + outputProps.join(' ') : '' }>${ html || renderChildren(vElement.children, context) }</${ tag }>`;
	}
}

function renderOptVElementToString(optVElement, isRoot, context) {
	return renderInputToString(convertVOptElementToVElement(optVElement), context, isRoot);
}

function renderInputToString(input, context, isRoot) {
	switch (input.nodeType) {
		case OPT_ELEMENT:
			return renderOptVElementToString(input, isRoot, context);
		case COMPONENT:
			return renderComponentToString(input, isRoot, context);
		case ELEMENT:
			return renderVElementToString(input, isRoot, context);
		case TEXT:
		case FRAGMENT:
		case PLACEHOLDER:
		default:
			throw Error('Inferno Error: Bad input argument called on renderInputToString(). Input argument may need normalising.');
	}
}

export default function renderToString(input) {
	return renderInputToString(input, null, true);
}

export function renderToStaticMarkup(input) {
	return renderInputToString(input, null, false);
}
