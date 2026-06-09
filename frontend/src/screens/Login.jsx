import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import axios from '../config/axios.js';
import { UserContext } from '../context/user.context.jsx';
const apiUrl = import.meta.env.VITE_API_URL;

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { setUser } = useContext(UserContext);

    const navigate = useNavigate();

    function submitHandler(e) {

        e.preventDefault();

        axios.post(`${apiUrl}/users/login`, {
            email,
            password
        }).then((res) => {
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
            navigate('/')
        })
            .catch((err) => {
                console.log(err.response?.data || err.message)
            })

    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-xl rounded-[28px] border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(15,23,42,0.35)] overflow-hidden">
                <div className="bg-slate-950 px-8 py-10 sm:px-10">
                    <div className="mb-8">
                        <div className="inline-block rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100">
                            Secure access
                        </div>
                        <h1 className="mt-6 text-3xl font-semibold text-white">Sign in</h1>
                        <p className="mt-3 max-w-xl text-sm text-slate-400">Enter your email and password to continue to your dashboard.</p>
                    </div>

                    <form onSubmit={submitHandler} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-600">
                                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-transparent pl-11 text-base text-slate-100 placeholder:text-slate-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-600">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-transparent pl-11 text-base text-slate-100 placeholder:text-slate-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                        >
                            Continue
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                        <span>New here?</span>
                        <button
                            onClick={() => navigate('/register')}
                            className="font-medium text-slate-100 transition hover:text-slate-50"
                        >
                            Create account
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;