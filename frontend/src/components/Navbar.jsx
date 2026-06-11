import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'

const Navbar = () => {
    const { user, setUser } = useContext(UserContext)
    const navigate = useNavigate()

    function logout() {
        axios.get('/users/logout').then(() => {
            localStorage.removeItem('token')
            setUser(null)
            navigate('/login')
        }).catch(() => {
            localStorage.removeItem('token')
            setUser(null)
            navigate('/login')
        })
    }

    return (
        <nav className='sticky top-0 z-10 flex items-center justify-between px-6 h-14 bg-slate-600 border-slate-200'>
            <div className='flex items-center gap-2 cursor-pointer text-amber-300' onClick={() => navigate('/')}>
                <i className='ri-terminal-box-line text-xl'></i>
                <span className='font-medium text-base'>DevRoom</span>
            </div>
            <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2 px-3 py-1 rounded-md bg-green-500'>
                    <div className='w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xs font-medium'>
                        {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </div>
                    <span className='text-sm'>{user?.name || user?.email}</span>
                </div>
                <button
                    onClick={logout}
                    className='flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 border border-slate-300 rounded-md hover:bg-red-600 cursor-pointer'
                >
                    <i className='ri-logout-box-r-line'></i>
                    Logout
                </button>
            </div>
        </nav>
    )
}

export default Navbar