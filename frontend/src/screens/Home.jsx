import { useContext, useState } from 'react'
import { UserContext } from '../context/user.context'
import axios from '../config/axios.js';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useContext(UserContext)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [project, setProject] = useState([])

  const navigate = useNavigate()

  function createProject(event) {
    event.preventDefault()

    axios.post('/projects/create', { name: projectName, })
      .then((res) => {
        setProjectName('')
        setIsModalOpen(false)
        setProject(prev => [...prev, res.data])
      }).catch((error) => {
        console.log(error.response.data)
      })
  }

  const deleteProject = async (projectId) => {

    const confirmed = window.confirm(
      "Are you sure you want to delete this Project?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `/projects/${projectId}`
      );

      setProject((prev) =>
        prev.filter((project) => project._id !== projectId)
      );
    } catch (error) {
      console.log(error.response?.status, error.response?.data);
    }
  };

  useEffect(() => {
    axios.get('/projects/all').then((res) => {
      setProject(res.data.projects)
    }).catch(err => {
      console.log(err)
    })
  }, [])

  return (
    <main className='p-4 bg-slate-500'>
      <div className='projects flex flex-wrap gap-3'>
        <button
          onClick={() => setIsModalOpen(true)}
          className='project p-4 cursor-pointer border border-slate-300 rounded-md flex items-center justify-center gap-2 hover:border-slate-400 transition'>
          <span className='text-sm font-medium'>New Project</span>
          <i className='ri-add-circle-fill text-xl'></i>
        </button>



        {
          project.map((project) => (
            <div key={project._id}
              onClick={() => {
                navigate(`/project`, { state: { project } })
              }}
              className='project flex flex-col gap-2 p-4 cursor-pointer border border-slate-200 rounded-md min-w-52 hover:bg-slate-400'>
              <h2 className='font-semibold flex justify-between'>
                {project.name}
                <button
                  className='p-1 rounded hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer'
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project._id);
                  }}><i className="ri-delete-bin-6-line"></i></button>
              </h2>

              <div className='flex gap-2'>
                <p><small><i className="ri-user-line"></i> Collaborators :</small></p>
                {project.users.length}

              </div>

            </div>

          ))
        }
      </div>



      {
        isModalOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
            <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200'>
              <div className='mb-5 flex items-center justify-between'>
                <h2 className='text-lg font-semibold'>Create Project</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='rounded-full p-2 text-slate-500 hover:bg-slate-100'>
                  ✕
                </button>
              </div>
              <form onSubmit={createProject} className='space-y-4'>
                <div>
                  <label className='mb-2 block text-sm font-medium text-slate-700'>
                    Project Name
                  </label>
                  <input
                    type='text'
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder='Enter project name'
                    className='w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:bg-white'
                    required
                  />
                </div>
                <div className='flex justify-end gap-3'>
                  <button
                    type='button'
                    onClick={() => setIsModalOpen(false)}
                    className='rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100'>
                    Cancel
                  </button>
                  <button
                    type='submit'
                    className='rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700'>
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </main >
  )
}

export default Home
