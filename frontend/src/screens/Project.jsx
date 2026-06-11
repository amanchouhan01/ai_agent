import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage, getSocket } from '../config/socket';
import { UserContext } from '../context/user.context';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from "../config/webContainer.js";
import 'highlight.js/styles/nord.css';
import { toast } from 'react-toastify';


function SyntaxHighlightedCode(props) {
    const ref = useRef(null)
    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-')) {
            hljs.highlightElement(ref.current)
            ref.current.removeAttribute('data-highlighted')
        }
    }, [props.className, props.children])
    return <code {...props} ref={ref} />
}

const Project = () => {
    const location = useLocation();
    const initialProject = location.state?.project || {}
    const projectId = initialProject._id

    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState(new Set())
    const [project, setProject] = useState(initialProject)
    const [message, setMessage] = useState('')
    const { user } = useContext(UserContext)
    const messageBox = useRef(null)
    const [messages, setMessages] = useState(initialProject?.messages || [])
    const [users, setUsers] = useState([])
    const [fileTree, setFileTree] = useState({})
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [webContainer, setWebContainer] = useState(null)
    const [iframeUrl, setIframeUrl] = useState(null)
    const [runProcess, setRunProcess] = useState(null)
    const [isRunning, setIsRunning] = useState(false)
    const [previewWidth, setPreviewWidth] = useState(35) // percentage
    const isDragging = useRef(false)

    const navigate = useNavigate()

    const handleDragStart = () => {
        isDragging.current = true
    }

    const handleDrag = (e) => {
        if (!isDragging.current) return
        const container = e.currentTarget.parentElement
        const containerRect = container.getBoundingClientRect()
        const newPreviewWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100
        if (newPreviewWidth > 20 && newPreviewWidth < 70) {
            setPreviewWidth(newPreviewWidth)
        }
    }

    const handleDragEnd = () => {
        isDragging.current = false
    }

    const handleUserClick = (id) => {
        setSelectedUserId((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function addCollaborators() {
        toast.promise(
            axios.put('/projects/add-user', {
                projectId,
                users: Array.from(selectedUserId)
            }).then(() => {
                setIsModalOpen(false)
                setSelectedUserId(new Set())
                axios.get(`/projects/get-project/${projectId}`).then(res => setProject(res.data.project))
            }),
            {
                pending: 'Adding collaborators...',
                success: 'Collaborators added!',
                error: 'Failed to add collaborators'
            }
        )
    }

    function addOutgoingMessage(msg) {
        setMessages(prev => [...prev, { message: msg, sender: user }])
    }

    const send = () => {
        if (!message.trim()) {
            toast.error("Message cannot be empty");
            return
        }

        sendMessage('project-message', { message, sender: user });
        addOutgoingMessage(message)
        setMessage("")
    }

    function WriteAiMessage(message) {
        const messageObject = JSON.parse(message)
        return (
            <div className='overflow-auto bg-slate-800 text-slate-100 rounded-lg p-3 text-sm'>
                <Markdown children={messageObject.text} options={{ overrides: { code: SyntaxHighlightedCode } }} />
            </div>
        )
    }

    useEffect(() => {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight
        }
    }, [messages])

    const webContainerRef = useRef(null)

    useEffect(() => {
        initializeSocket(project._id)
        getWebContainer().then(container => {
            setWebContainer(container)
            webContainerRef.current = container
        })
        receiveMessage('project-message', data => {
            if (data?.sender?._id === 'ai' && data?.message) {
                try {
                    const parsed = JSON.parse(data.message)
                    if (parsed?.fileTree) {
                        webContainerRef.current?.mount(parsed.fileTree)
                        setFileTree(parsed.fileTree)
                    }
                } catch (e) { console.error('AI message parse failed:', e) }
            }
            setMessages(prev => [...prev, data])
        })

        receiveMessage('collaborator-added', () => {
            axios.get(`/projects/get-project/${projectId}`).then(res => {
                setProject(res.data.project)
                toast.info('New collaborator added to this project!')
            })
        })

        receiveMessage('project-deleted', ({ projectId: deletedId }) => {
            if (deletedId === projectId) {
                toast.error('This project has been deleted!')
                navigate('/')
            }
        })


        if (projectId) {
            axios.get(`/projects/get-project/${projectId}`)
                .then(res => {
                    setProject(res.data.project)
                    setFileTree(res.data.project.fileTree || {})
                    setMessages(res.data.project?.messages || [])
                }).catch(err => {
                    if (err.response?.status === 404) {
                        toast.error('Project not found or deleted!')
                        navigate('/')
                    }
                })
        }
        axios.get('/users/all').then(res => setUsers(res.data.user)).catch(err => console.log(err))
        return () => {
            getSocket()?.off('project-message')
            getSocket()?.off('collaborator-added')
            getSocket()?.off('project-deleted')
        }
    }, [])

    // Autosave on changing filetree
    useEffect(() => {
        if (project._id && Object.keys(fileTree).length > 0) {
            saveFileTree(fileTree)
        }
    }, [fileTree])

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft

        }).catch(err => {
            console.log(err.response?.data)
        });
    }

    const handleRun = async () => {
        if (isRunning) {
            // Stop
            runProcess?.kill()
            setRunProcess(null)
            setIsRunning(false)
            setIframeUrl(null)
            return
        }

        // Run
        setIsRunning(true)
        await webContainer.mount(fileTree)

        const installProcess = await webContainer.spawn("npm", ["install"])
        await new Promise((resolve) => {
            installProcess.output.pipeTo(new WritableStream({
                write(chunk) { console.log(chunk) }
            }))
            installProcess.exit.then(resolve)
        })

        if (runProcess) runProcess.kill()

        const tempRunProcess = await webContainer.spawn("npm", ["start"])
        tempRunProcess.output.pipeTo(new WritableStream({
            write(chunk) { console.log(chunk) }
        }))
        setRunProcess(tempRunProcess)

        webContainer.on('server-ready', (port, url) => {
            setIframeUrl(url)
            setIsRunning(false)
        })
    }

    const deleteCurrentProject = async () => {
        if (!window.confirm('Delete this project?')) return
        toast.promise(
            axios.delete(`/projects/${projectId}`)
                .then(() => {
                    // Socket se saaro ko broadcast karo
                    sendMessage('project-deleted', { projectId })
                    navigate('/')
                }),
            {
                pending: 'Deleting...',
                success: 'Deleted!',
                error: 'Failed'
            }
        )
    }

    return (
        <main className='h-[calc(100vh-56px)] w-screen flex overflow-hidden bg-slate-800'>

            {/* ── LEFT PANEL: Chat ── */}
            <section className='relative flex flex-col h-full min-w-[280px] max-w-[380px] w-[30%] bg-slate-900 border-r border-slate-700'>

                {/* Header */}
                <header className='flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0'>
                    <div>
                        <h2 className='text-sm font-semibold text-white truncate max-w-[160px]'>
                            {project.name || 'Project'}
                        </h2>
                        <p className='text-xs text-slate-400'>
                            {project.users?.length || 0} collaborator{project.users?.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className='flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition'>
                            <i className="ri-user-add-fill text-sm"></i>
                            Add
                        </button>
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className='p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition'>
                            <i className="ri-group-fill text-lg"></i>
                        </button>
                        <button
                            onClick={deleteCurrentProject}
                            className='p-1.5 rounded-lg text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition'>
                            <i className="ri-delete-bin-6-line text-lg"></i>
                        </button>
                    </div>

                </header>

                {/* Messages */}
                <div
                    ref={messageBox}
                    className='flex flex-col gap-2 p-3 overflow-y-auto grow custom-scroll'>
                    {messages.map((msg, idx) => {
                        const isOwn = msg.sender?._id === user?._id
                        const isAI = msg.sender?._id === 'ai'
                        return (
                            <div key={idx} className={`flex flex-col max-w-[85%] ${isOwn ? 'ml-auto items-end' : 'items-start'} `}>
                                <div className={`rounded-xl px-3 py-2 text-sm ${isAI
                                    ? 'w-full' : isOwn
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-700 text-slate-100'}`}>
                                    {!isOwn && (
                                        <span className={`text-[10px] font-semibold block mb-1 ${isAI ? 'text-blue-400' : 'text-emerald-400'
                                            }`}>
                                            {isAI ? '✦ AI' : msg.sender?.email?.split('@')[0]}
                                        </span>
                                    )}

                                    {isAI ? WriteAiMessage(msg.message) : (
                                        <div className='flex items-end gap-2'>
                                            <span className='leading-relaxed'>{msg.message}</span>
                                            <span className='text-[10px] text-slate-300/60 whitespace-nowrap self-end'>
                                                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Input */}
                <div className='flex items-center gap-2 p-3 border-t border-slate-700 bg-slate-800 shrink-0'>
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
                        className='grow bg-slate-700 text-white text-sm rounded-lg px-4 py-2 outline-none border border-slate-600 focus:border-blue-500 placeholder-slate-500'
                        type="text"
                        placeholder='Message or @ai ...'
                    />
                    <button
                        onClick={send}
                        className='w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shrink-0'>
                        <i className="ri-send-plane-fill text-sm"></i>
                    </button>
                </div>

                {/* Side Panel — Collaborators */}
                <div className={`absolute top-0 left-0 w-full h-full flex flex-col bg-slate-900 border-r border-slate-700 transition-transform duration-200 z-10 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <header className='flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700'>
                        <h2 className='text-sm font-semibold text-white'>Collaborators</h2>
                        <button onClick={() => setIsSidePanelOpen(false)} className='text-slate-400 hover:text-white'>
                            <i className='ri-close-fill text-lg'></i>
                        </button>
                    </header>
                    <div className='flex flex-col gap-2 p-3 overflow-y-auto custom-scroll'>
                        {project.users?.map(projectUser => {
                            const uid = typeof projectUser === 'string' ? projectUser : projectUser._id
                            const uname = typeof projectUser === 'string' ? projectUser : (projectUser.name || projectUser.email)
                            const isCurrentUser = uid?.toString() === user?._id?.toString()
                            return (
                                <div key={uid} className='flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700'>
                                    <div className='w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0'>
                                        <i className="ri-user-fill text-blue-400 text-sm"></i>
                                    </div>
                                    <span className='text-sm text-slate-200'>{isCurrentUser ? 'You' : uname}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ── RIGHT PANEL: Editor ── */}
            <section className='flex grow h-full overflow-hidden'
                onMouseMove={handleDrag}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
            >

                {/* File Explorer */}
                <div className='h-full w-[180px] min-w-[140px] bg-slate-900 border-r border-slate-700 overflow-y-auto shrink-0 custom-scroll'>
                    <p className='text-[10px] text-slate-500 uppercase tracking-widest px-3 py-2 font-medium'>Explorer</p>
                    {Object.keys(fileTree || {}).map((file) => (
                        <button
                            key={file}
                            onClick={() => {
                                setCurrentFile(file)
                                setOpenFiles([...new Set([...openFiles, file])])
                            }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-700 transition ${currentFile === file ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
                            <i className='ri-file-code-line text-sm text-slate-500'></i>
                            <span className='truncate'>{file}</span>
                        </button>
                    ))}
                </div>

                {/* Code Editor */}
                <div className='flex flex-col grow h-full overflow-hidden min-w-0'>

                    {/* File Tabs + Run Button */}
                    <div className='p-1 flex items-center justify-between bg-slate-900 border-b border-slate-700 shrink-0'>
                        <div className='flex overflow-x-auto custom-scroll [&::-webkit-scrollbar]:hidden '>
                            {openFiles.map((file) => (
                                <div
                                    key={file}
                                    onClick={() => setCurrentFile(file)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer border-r border-slate-700 shrink-0 transition ${currentFile === file ? 'bg-slate-700 text-white border-t-2 border-t-blue-500' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <i className='ri-file-code-line text-xs'></i>
                                    <span>{file}</span>
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const newOpenFiles = openFiles.filter(f => f !== file)
                                            setOpenFiles(newOpenFiles)
                                            if (currentFile === file) setCurrentFile(newOpenFiles[newOpenFiles.length - 1] || null)
                                        }}
                                        className='ml-1 w-4 h-4 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-600 text-xs'>
                                        ✕
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleRun}
                            className={`flex items-center gap-2 px-4 py-2 mx-2 text-sm rounded-lg transition shrink-0 text-white ${isRunning
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}>
                            {isRunning
                                ? <><i className='ri-stop-fill'></i> Stop</>
                                : <><i className='ri-play-fill'></i> Run</>
                            }
                        </button>
                    </div>

                    {/* Editor Area */}
                    <div className='flex grow overflow-hidden'>
                        {fileTree[currentFile] ? (
                            <div className='h-full overflow-auto grow bg-slate-950 custom-scroll'>
                                <pre className='hljs h-full'>
                                    <code
                                        className='hljs h-full outline-none text-sm'
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => {
                                            const ft = {
                                                ...fileTree,
                                                [currentFile]: { file: { contents: e.target.innerText } }
                                            }
                                            setFileTree(ft)
                                            saveFileTree(ft)
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html: hljs.highlight(
                                                fileTree[currentFile]?.file?.contents || '',
                                                { language: 'javascript' }
                                            ).value
                                        }}
                                        style={{ whiteSpace: 'pre-wrap', paddingBottom: '25rem' }}
                                    />
                                </pre>
                            </div>
                        ) : (
                            <div className='flex flex-col items-center justify-center grow text-slate-600 gap-3'>
                                <i className='ri-code-s-slash-line text-5xl'></i>
                                <p className='text-sm'>Select a file to start editing</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview iframe */}
                {iframeUrl && webContainer && (
                    <div
                        style={{ width: `${previewWidth}%` }}
                        className='relative flex flex-col h-full border-l border-slate-700 shrink-0'>

                        {/* Drag Handle */}
                        <div
                            onMouseDown={handleDragStart}
                            className='absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition z-10'
                        />

                        <div className='flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-700'>
                            <i className='ri-global-line text-slate-400 text-sm'></i>
                            <input
                                type="text"
                                onChange={(e) => setIframeUrl(e.target.value)}
                                value={iframeUrl}
                                className='grow text-xs bg-slate-700 text-white rounded-md px-3 py-1.5 outline-none border border-slate-600 focus:border-blue-500'
                            />
                        </div>
                        <iframe src={iframeUrl} className='w-full h-full bg-white' />
                    </div>
                )}
            </section>

            {/* ── Add Collaborator Modal ── */}
            {isModalOpen && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
                    <div className='w-full max-w-md rounded-2xl bg-slate-800 border border-slate-600 overflow-hidden'>
                        <header className='flex items-center justify-between px-5 py-4 border-b border-slate-700'>
                            <h2 className='text-sm font-semibold text-white'>Add Collaborator</h2>
                            <button onClick={() => setIsModalOpen(false)} className='text-slate-400 hover:text-white'>
                                <i className="ri-close-large-fill"></i>
                            </button>
                        </header>
                        <div className='flex flex-col gap-2 p-4 max-h-80 overflow-y-auto custom-scroll'>
                            {users.map((u) => (
                                <div
                                    key={u._id}
                                    onClick={() => handleUserClick(u._id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${selectedUserId.has(u._id) ? 'bg-blue-900/50 border-blue-600' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>
                                    <div className='w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0'>
                                        <i className="ri-user-fill text-slate-300 text-sm"></i>
                                    </div>
                                    <span className='text-sm text-slate-200'>{u.email}</span>
                                    {selectedUserId.has(u._id) && <i className='ri-check-fill text-blue-400 ml-auto'></i>}
                                </div>
                            ))}
                        </div>
                        <div className='px-4 py-3 border-t border-slate-700 flex justify-end gap-3'>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className='px-4 py-2 text-sm text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700'>
                                Cancel
                            </button>
                            <button
                                onClick={addCollaborators}
                                className='px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg'>
                                Add ({selectedUserId.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project