import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage, getSocket } from '../config/socket';
import { UserContext } from '../context/user.context';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from "../config/webContainer.js";
import 'highlight.js/styles/nord.css';



function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-')) {
            hljs.highlightElement(ref.current)

            //hljs wont reprocess the element unless this attribute is removed
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

    const [users, setUsers] = useState([]);

    const [fileTree, setFileTree] = useState({})

    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [webContainer, setWebContainer] = useState(null)
    const [iframeUrl, setIframeUrl] = useState(null)
    const [runProcess, setRunProcess] = useState(null)


    const handleUserClick = (id) => {
        setSelectedUserId((prevSelectedUserId) => {
            const nextSelectedUserId = new Set(prevSelectedUserId)
            if (nextSelectedUserId.has(id)) {
                nextSelectedUserId.delete(id)
            } else {
                nextSelectedUserId.add(id)
            }
            return nextSelectedUserId
        })
    }


    function addCollaborators() {
        axios.put('/projects/add-user', {
            projectId,
            users: Array.from(selectedUserId)
        }).then(res => {
            setIsModalOpen(false)
            setSelectedUserId(new Set())
            axios.get(`/projects/get-project/${projectId}`).then(res => {
                setProject(res.data.project)
            })
        }).catch(err => {
            console.log(err)
        })
    }

    // add outgoing message (sent by current user)
    function addOutgoingMessage(msg) {
        const outgoing = { message: msg, sender: user }
        setMessages(prev => [...prev, outgoing])
    }

    const send = () => {
        if (!message.trim()) return

        sendMessage('project-message', {
            message,
            sender: user,
        })
        addOutgoingMessage(message)
        setMessage("")
    }

    function WriteAiMessage(message) {
        const messageObject = JSON.parse(message)

        return (
            <div className='overflow-auto bg-slate-700 text-white rounded-sm p-2'>
                <Markdown
                    children={messageObject.text}
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode
                        }
                    }}>
                </Markdown>
            </div>

        )
    }


    // auto-scroll when messages change
    useEffect(() => {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight
        }
    }, [messages])


    const webContainerRef = useRef(null)

    useEffect(() => {

        initializeSocket(project._id);

        getWebContainer().then(container => {
            setWebContainer(container)
            webContainerRef.current = container  // ← ref bhi set karo
        })


        receiveMessage('project-message', data => {
            console.log(data)

            if (data?.sender?._id === 'ai' && data?.message) {
                try {
                    const parsed = JSON.parse(data.message);

                    if (parsed?.fileTree) {
                        webContainerRef.current?.mount(parsed.fileTree);
                        setFileTree(parsed.fileTree);
                    }

                } catch (e) {
                    console.error('AI message parse failed:', e);
                }
            }
            setMessages(prev => [...prev, data])
        })

        if (projectId) {
            axios.get(`/projects/get-project/${projectId}`).then(res => {

                setProject(res.data.project)
                setFileTree(res.data.project.fileTree || {})
                setMessages(res.data.project?.messages || [])
            })
        }

        axios.get('/users/all').then(res => {
            setUsers(res.data.user)
        }).catch(err => {
            console.log(err)
        })

        return () => {
            getSocket()?.off('project-message')  // ← cleanup 
        }
    }, [])

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }




    return (
        <main className='h-[calc(100vh-56px)] w-screen flex overflow-hidden'>


            <section className='left relative flex flex-col h-full  min-w-[280px] max-w-[380px] w-[30%] bg-sky-950'>

                <header className='flex justify-between p-2 px-4 w-full bg-slate-400 items-center'>

                    <button className='flex items-center gap-1 cursor-pointer'
                        onClick={() => setIsModalOpen(true)}
                    >
                        <i className="ri-user-add-fill"></i>
                        <p>Add collaborator</p>
                    </button>


                    <button
                        onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                        className='p-2  cursor-pointer'>
                        <i className="ri-group-fill"></i>
                    </button>
                </header>


                <div className="conversation-area grow flex flex-col overflow-auto">

                    <div
                        ref={messageBox}
                        className='message-box grow flex flex-col gap-1 p-1.5 overflow-auto max-h-full'>
                        {messages.map((msg, idx) => {
                            const isOwn = msg.sender?._id === user?._id
                            const isAI = msg.sender?._id === 'ai'
                            const classes = `${isOwn ? 'max-w-52 ml-auto' : 'max-w-80'} flex flex-col p-2 bg-slate-200 w-fit rounded-md`
                            return (
                                <div key={idx} className={classes}>
                                    <small className='opacity-65 text-xs min-w-20'>
                                        {msg.sender?._id === user?._id ? 'You'
                                            : msg.sender?.email || 'AI'}</small>

                                    {isAI ? (

                                        WriteAiMessage(msg.message)

                                    ) : (
                                        <div className='text-sm'>{msg.message}</div>
                                    )
                                    }
                                </div>
                            )
                        })}
                    </div>


                    <div className="inputfield w-full flex py-2 items-center gap-1 relative">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    send();
                                }
                            }}
                            className='p-2 px-4 border-none outline-none grow flex bg-slate-400 rounded-md h-10'
                            type="text" placeholder='Enter message'>

                        </input>

                        <button
                            onClick={send}
                            className='flex items-center justify-center h-10 w-10 bg-gray-950 text-white cursor-pointer rounded-md'><i className="ri-send-plane-fill "></i></button>
                    </div>


                </div>

                <div className={`sidePanel w-full h-full flex flex-col gap-2 bg-slate-300 transition-all ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} absolute top-0`}>

                    <header className='flex items-center justify-between p-4 px-4 bg-slate-400 border-b'>
                        <h1 className='font-semibold text-lg'>Collaborators</h1>
                        <button className='cursor-pointer' onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}><i className='ri-close-fill'></i></button>

                    </header>

                    <div className="users flex flex-col items-center gap-2 p-2 bg-slate-300 overflow-hidden">

                        {
                            project.users && project.users.map(projectUser => {

                                const userId = typeof projectUser === 'string' ? projectUser : projectUser._id
                                const userName = typeof projectUser === 'string' ? projectUser : (projectUser.name || projectUser.email)
                                const isCurrentUser = userId?.toString() === user?._id?.toString()  // ← toString() dono pe
                                return (
                                    <div key={userId} className="user cursor-pointer hover:bg-slate-400 flex gap-2 p-2 items-center rounded-sm w-full  ">
                                        <div className='aspect-square rounded-full w-fit h-fit flex items-center justify-center bg-slate-400 border border-black px-3'>
                                            <i className="ri-user-fill"></i>
                                        </div>
                                        <h1 className='font-semibold text-lg'>
                                            {isCurrentUser ? 'You' : userName}
                                        </h1>
                                    </div>
                                )
                            })
                        }


                    </div>


                </div>


            </section>

            <section className='right bg-slate-300 flex grow h-full overflow-hidden'>

                <div className="explorer h-full max-w-[240px] min-w-[180px] w-[20%] bg-slate-200 overflow-y-auto flex shrink-0">
                    <div className="file-tree w-full">
                        {
                            Object.keys(fileTree || {}).map((file) => (
                                <button
                                    key={file}
                                    onClick={() => {
                                        setCurrentFile(file)
                                        setOpenFiles([...new Set([...openFiles, file])])
                                    }}
                                    className="tree-element cursor-pointer p-2 flex items-center bg-slate-300 w-full">
                                    <p className='font-semibold text-lg'>{file}</p>
                                </button>
                            ))
                        }
                    </div>
                </div>



                <div className="code-editor flex flex-col grow h-full overflow-hidden min-w-0">

                    <div className="top flex justify-between w-full">

                        <div className="files flex">

                            {
                                openFiles.map((file) => (
                                    <button
                                        key={file}
                                        onClick={() => setCurrentFile(file)}
                                        className={`open-file cursor pointer p-2 px-4 flex items-center gap-2 bg-slate-300 w-fit ${currentFile === file ? 'bg-slate-400' : ''}`}
                                    >
                                        <p className='font-semibold text-lg'>{file}</p>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation()  // ← file select hone se rokta hai

                                                const newOpenFiles = openFiles.filter(f => f !== file)
                                                setOpenFiles(newOpenFiles)

                                                // agar yahi file open thi toh next file select karo
                                                if (currentFile === file) {
                                                    setCurrentFile(newOpenFiles[newOpenFiles.length - 1] || null)
                                                }
                                            }}
                                            className='ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-500 rounded-sm w-4 h-4 flex items-center justify-center text-xs cursor-pointer'
                                        >
                                            ✕
                                        </span>
                                    </button>
                                ))
                            }
                        </div>

                        <div className="actions flex gap-2">
                            <button
                                onClick={async () => {

                                    await webContainer.mount(fileTree)
                                    const installProcess = await webContainer.spawn("npm", ["install"])
                                    installProcess.output.pipeTo(new WritableStream({
                                        write(chunk) {
                                            console.log(chunk)
                                        }
                                    }))

                                    if (runProcess) {
                                        runProcess.kill()
                                    }

                                    let tempRunProcess = await webContainer.spawn("npm", ["start"]);


                                    tempRunProcess.output.pipeTo(new WritableStream({
                                        write(chunk) {
                                            console.log(chunk)
                                        }
                                    }))

                                    setRunProcess(tempRunProcess)

                                    webContainer.on('server-ready', (port, url) => {
                                        console.log(port, url)
                                        setIframeUrl(url)
                                    })
                                }}
                                className='p-2 px-4 bg-slate-800 text-white'
                            >
                                Run
                            </button>
                        </div>
                    </div>
                    <div className="bottom flex grow overflow-hidden">
                        {
                            fileTree[currentFile] && (
                                <div className='code-editor-area h-full overflow-auto flew grow bg-slate-50'>
                                    <pre className='hljs h-full'>
                                        <code className='hljs h-full outline-none'
                                            contentEditable
                                            suppressContentEditableWarning
                                            // onBlur save
                                            onBlur={(e) => {
                                                const updatedContent = e.target.innerText;
                                                const ft = {
                                                    ...fileTree,
                                                    [currentFile]: {
                                                        file: {
                                                            contents: updatedContent
                                                        }
                                                    }
                                                }
                                                setFileTree(ft)
                                                saveFileTree(ft)
                                            }}
                                            // dangerouslySetInnerHTML
                                            dangerouslySetInnerHTML={{
                                                __html: hljs.highlight(
                                                    fileTree[currentFile]?.file?.contents || '',
                                                    { language: 'javascript' }
                                                ).value
                                            }}
                                            style={{
                                                whiteSpace: 'pre-wrap',
                                                paddingBottom: '25rem',
                                                counterSet: 'line-numbering',
                                            }}
                                        ></code>
                                    </pre>

                                </div>
                            )
                        }
                    </div>
                </div>

                {iframeUrl && webContainer && (
                    <div className='flex min-w-[320px] max-w-[40%] flex-col h-full shrink-0'>

                        <div className="address-bar">
                            <input type="text"
                                onChange={(e) => setIframeUrl(e.target.value)}
                                value={iframeUrl} className='w-full p-2 px-4 bg-slate-400' />
                        </div>
                        <iframe src={iframeUrl} className='w-full h-full'></iframe>

                    </div>
                )
                }


            </section>

            {
                isModalOpen && (
                    <div className='fixed inset-0 flex items-center justify-center'>
                        <div className='bg-white p-4 rounded-md w-96 max-w-full relative'>


                            <header className='flex items-center justify-between border-b px-5 py-4'>
                                <h2 className='text-sm font-semibold'>Select User</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className='text-slate-500 hover:text-slate-900'
                                >
                                    <i className="ri-close-large-fill"></i>
                                </button>
                            </header>


                            <div className='user-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto'>

                                {users.map((user) => (

                                    <div
                                        key={user._id}
                                        className={`w-full rounded-lg border flex items-center gap-2 border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-300 ${Array.from(selectedUserId).indexOf(user._id) != -1 ? 'bg-slate-700' : ''}`} onClick={() => handleUserClick(user._id)}
                                    >
                                        <div className='aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                            <i className="ri-user-fill absolute"></i>
                                        </div>
                                        <h1 className='font-semibold text-lg'>{user.email}</h1>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addCollaborators}
                                className='absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-md'>
                                Add Collaborators
                            </button>


                        </div>
                    </div>
                )
            }

        </main >
    )
}

export default Project

