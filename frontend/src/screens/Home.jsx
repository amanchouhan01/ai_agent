import { useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { UserContext } from '../context/user.context'
import axios from '../config/axios.js'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'


const Home = () => {
  const { user } = useContext(UserContext)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [project, setProject] = useState([])

  const navigate = useNavigate()

  const now = useMemo(() => Date.now(), [])

  const timeAgo = useCallback((dateString) => {
    if (!dateString) return '—'
    const diff = now - new Date(dateString).getTime()
    if (isNaN(diff)) return '—'

    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }, [now])

  const todayString = useMemo(() => new Date(now).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }), [now])

  const totalCollaborators = useMemo(() => project.reduce((sum, p) => sum + (p.users?.length || 0), 0), [project])



  const lastActiveProject = useMemo(() => project.length > 0
    ? project.reduce((latest, p) =>
      new Date(p.updatedAt) > new Date(latest.updatedAt) ? p : latest
    )
    : null, [project])

  const stats = useMemo(() => [
    { label: 'Total Projects', value: project.length, sub: `+1 this week`, icon: 'ri-folder-line', bg: 'bg-blue-900/40', iconColor: 'text-blue-400' },

    { label: 'Collaborators', value: totalCollaborators, sub: 'across all projects', icon: 'ri-team-line', bg: 'bg-green-900/40', iconColor: 'text-green-400' },

    { label: 'AI Chats', value: '—', sub: 'Gemini queries today', icon: 'ri-robot-line', bg: 'bg-amber-900/40', iconColor: 'text-amber-400' },

    {
      label: 'Last Active',
      value: lastActiveProject ? timeAgo(lastActiveProject.updatedAt) : '—',
      sub: lastActiveProject ? `in "${lastActiveProject.name}"` : 'no projects yet',
      icon: 'ri-time-line',
      bg: 'bg-purple-900/40',
      iconColor: 'text-purple-400'
    },
  ], [project, lastActiveProject, totalCollaborators])

  const activityColors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500']


  function createProject(event) {
    event.preventDefault()
    toast.promise(
      axios.post('/projects/create', { name: projectName })
        .then((res) => {
          setProjectName('')
          setIsModalOpen(false)
          setProject(prev => [...prev, res.data])
        }),
      {
        pending: 'Creating project...',
        success: 'Project created successfully! 🎉',
        error: (err) => err?.response?.data?.message || 'Failed to create project'
      }

    )
  }

  const deleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return

    toast.promise(
      axios.delete(`/projects/${projectId}`)
        .then(() => {
          setProject(prev => prev.filter(p => p._id !== projectId))
          const bc = new BroadcastChannel('devroom')
          bc.postMessage({type: 'project-deleted', projectId})
          bc.close()
        }),
      {
        pending: 'Deleting project...',
        success: 'Project deleted!',
        error: (err) => err?.response?.data?.message || 'Failed to delete project'
      }

    )


  }

  useEffect(() => {
    const fetchProjects = () => {
      axios.get('/projects/all')
        .then((res) => {
          setProject(res.data.projects)
        })
        .catch(err => {
          console.log(err)
          toast.error('Failed to load projects')
        })
    }

    fetchProjects()
    const interval = setInterval(fetchProjects, 2000)
    return () => clearInterval(interval)
  }, [])


  return (
    <main className='min-h-screen bg-slate-800 text-white p-6'>

      {/* Greeting + New Project */}
      <div className='flex items-start justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-semibold'>
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className='text-sm text-slate-400 mt-1'>
            {todayString} — {project.length} active projects
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className='flex items-center gap-2 px-4 py-2 border border-slate-500 rounded-lg text-sm hover:bg-slate-700 transition'>
          <i className='ri-add-line'></i> New Project
        </button>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        {stats.map((stat) => (
          <div key={stat.label} className='bg-slate-700 rounded-xl p-4 border border-slate-700'>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}>
              <i className={`${stat.icon} text-lg ${stat.iconColor}`}></i>
            </div>
            <p className='text-xs text-slate-400 mb-1'>{stat.label}</p>
            <p className='text-3xl font-medium'>{stat.value}</p>
            <p className='text-xs text-slate-500 mt-1'>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Projects + Activity */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>

        {/* Recent Projects */}
        <div className='bg-slate-700 rounded-xl p-5 border border-slate-700'>
          <p className='text-xs text-slate-400 uppercase tracking-widest font-medium mb-4'>Recent Projects</p>
          <div className='overflow-y-auto max-h-[324px] custom-scroll overflow-x-hidden pl-3 pr-3 p-2 bg-slate-800 rounded-lg'>
            {project.length === 0 ? (
              <div
                className=' text-slate-500 flex justify-between items-center'>
                No projects yet.
                <p onClick={() => setIsModalOpen(true)} className='cursor-pointer bg-blue-600 pl-2 pr-2 p-1 rounded-lg hover:bg-blue-800 text-white'>Create One!</p>
              </div>
            ) : (
              project.map((proj, i) => (
                <div
                  key={proj._id}
                  onClick={() => navigate('/project', { state: { project: proj } })}
                  className='flex items-center gap-3 py-3 border-b border-slate-700 last:border-0 cursor-pointer hover:bg-slate-700 rounded-lg px-2 -mx-2 transition '>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${activityColors[i % activityColors.length].replace('bg-', 'bg-').replace('500', '900/50')}`}>
                    <i className={`ri-code-s-slash-line text-sm ${activityColors[i % activityColors.length].replace('bg-', 'text-').replace('500', '400')}`}></i>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>{proj.name}</p>
                    <p className='text-xs text-slate-400'>{proj.users?.length} collaborator{proj.users?.length !== 1 ? 's' : ''} · {timeAgo(proj.updatedAt)}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400 border border-blue-700/50'>
                      Active
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProject(proj._id) }}
                      className='pl-2 pr-2 p-1 rounded-full hover:bg-red-400 hover:text-red-800 text-slate-500 transition'>
                      <i className='ri-delete-bin-6-line text-sm'></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className='bg-slate-700 rounded-xl p-5 border border-slate-700'>
          <p className='text-xs text-slate-400 uppercase tracking-widest font-medium mb-4'>Recent Activity</p>
          {[
            { color: 'bg-blue-500', text: 'Open a project to start coding', time: 'Just now' },
            { color: 'bg-green-500', text: 'Invite collaborators from inside a project', time: 'Tip' },
            { color: 'bg-amber-500', text: 'Use AI chat to generate your file tree', time: 'Tip' },
            { color: 'bg-purple-500', text: 'WebContainer runs code right in your browser', time: 'Tip' },
          ].map((item, i) => (
            <div key={i} className='flex gap-3 py-3 border-b border-slate-700 last:border-0'>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.color}`}></div>
              <div>
                <p className='text-sm text-slate-300'>{item.text}</p>
                <p className='text-xs text-slate-500 mt-0.5'>{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className='bg-slate-800 rounded-xl p-5 border border-slate-700'>
        <p className='text-xs text-slate-400 uppercase tracking-widest font-medium mb-4'>Quick Tips</p>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {[
            { icon: 'ri-robot-line', color: 'text-blue-400', title: 'Ask Gemini first', desc: 'Type @ai in the chat to generate full file trees from a single prompt.' },
            { icon: 'ri-user-add-line', color: 'text-green-400', title: 'Invite collaborators', desc: 'Open a project and use the + icon to add teammates by email.' },
            { icon: 'ri-terminal-line', color: 'text-amber-400', title: 'Live terminal', desc: 'WebContainer runs your code in-browser — no server setup needed.' },
            { icon: 'ri-share-line', color: 'text-purple-400', title: 'Share project', desc: 'Copy the project link and send it directly to collaborators.' },
          ].map((tip) => (
            <div key={tip.title} className='bg-slate-700 rounded-lg p-4 border border-slate-700'>
              <i className={`${tip.icon} text-xl ${tip.color} block mb-3`}></i>
              <p className='text-sm font-medium mb-1'>{tip.title}</p>
              <p className='text-xs text-slate-400 leading-relaxed'>{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-md rounded-2xl bg-slate-700 p-6 border border-slate-600'>
            <div className='mb-5 flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Create Project</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className='rounded-full p-2 text-slate-400 hover:bg-slate-700'>
                ✕
              </button>
            </div>
            <form onSubmit={createProject} className='space-y-4'>
              <div>
                <label className='mb-2 block text-sm font-medium text-slate-300'>Project Name</label>
                <input
                  type='text'
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder='Enter project name'
                  className='w-full rounded-lg border border-slate-600 bg-slate-600 px-4 py-3 text-sm outline-none focus:border-blue-500 text-white placeholder-slate-500'
                  required
                />
              </div>
              <div className='flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={() => setIsModalOpen(false)}
                  className='rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700'>
                  Cancel
                </button>
                <button
                  type='submit'
                  className='rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default Home