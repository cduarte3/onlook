import { useEditorEngine } from '@/components/Context';
import { Textarea } from '@/components/ui/textarea';
import { sendAnalytics } from '@/lib/utils';
import { ResetIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { MainChannels } from '/common/constants';
import { CodeDiffRequest } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

const TailwindInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [instanceClasses, setInstanceClasses] = useState<string>('');
    const [rootClasses, setRootClasses] = useState<string>('');
    const [textFocus, setTextFocus] = useState(false);
    const [textRootFocus, setTextRootFocus] = useState(false);
    const textAreaSize = useRef<HTMLTextAreaElement>(null);
    const textAreaRootSize = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (editorEngine.elements.selected.length) {
            const selectedEl = editorEngine.elements.selected[0];
            getInstanceClasses(selectedEl.selector);
            getRootClasses(selectedEl.selector);
        }
    }, [editorEngine.elements.selected]);

    async function getInstanceClasses(selector: string) {
        const instance = editorEngine.ast.getInstance(selector);
        setInstance(instance);
        if (instance) {
            const instanceClasses: string[] = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                instance,
            );
            setInstanceClasses(instanceClasses.join(' '));
        }
    }

    async function getRootClasses(selector: string) {
        const root = editorEngine.ast.getRoot(selector);
        setRoot(root);
        if (root) {
            const rootClasses: string[] = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                root,
            );
            setRootClasses(rootClasses.join(' '));
        }
    }

    const createCodeDiffRequest = async (templateNode: TemplateNode, className: string) => {
        const request: CodeDiffRequest = {
            templateNode,
            selector: editorEngine.elements.selected[0].selector,
            attributes: { className },
            insertedElements: [],
            movedElements: [],
            removedElements: [],
            overrideClasses: true,
        };
        const codeDiffs = await editorEngine.code.getCodeDiff([request]);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);

        if (res) {
            editorEngine.webviews.getAll().forEach((webview) => {
                webview.executeJavaScript(`window.api?.processDom()`);
            });

            setTimeout(() => {
                const selected = editorEngine.elements.selected;
                if (selected.length === 0) {
                    console.error('No selected element');
                    return;
                }
                const selectedEl = selected[0];
                setInstance(editorEngine.ast.getInstance(selectedEl.selector));
                const root = editorEngine.ast.getRoot(selectedEl.selector);
                setRoot(root);
            }, 1000);

            sendAnalytics('tailwind action');
        }
    };

    function handleKeyDown(e: any) {
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
            e.target.blur();
            e.preventDefault();
        }
    }

    const adjustHeight = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight + 20}px`;
    };

    useEffect(() => {
        if (textAreaSize.current) {
            adjustHeight(textAreaSize.current);
        }
    }, [instanceClasses]);

    useEffect(() => {
        if (textAreaRootSize.current) {
            adjustHeight(textAreaRootSize.current);
        }
    }, [rootClasses]);

    return (
        <div className="flex flex-col gap-2 text-xs text-foreground-onlook">
            {instance && <p>Instance</p>}
            {instance && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={textAreaSize}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0"
                            placeholder="Add tailwind classes here"
                            value={instanceClasses}
                            onInput={(e: any) => setInstanceClasses(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={(e) => {
                                setTextFocus(false);
                                instance && createCodeDiffRequest(instance, e.target.value);
                            }}
                            onFocus={() => setTextFocus(true)}
                        />
                    </div>
                    {textFocus && (
                        <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                            <span>enter to apply</span>
                            <ResetIcon className="ml-1" />
                        </div>
                    )}
                </div>
            )}

            {instance && root && <p>Component</p>}
            {root && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={textAreaRootSize}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0 resize-none"
                            placeholder="Add tailwind classes here"
                            value={rootClasses}
                            onInput={(e: any) => setRootClasses(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={(e) => {
                                setTextRootFocus(false);
                                root && createCodeDiffRequest(root, e.target.value);
                            }}
                            onFocus={() => setTextRootFocus(true)}
                        />
                    </div>
                    {textRootFocus && (
                        <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                            <span>enter to apply</span>
                            <ResetIcon className="ml-1" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default TailwindInput;
