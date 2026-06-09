import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { UserContext } from '../context/user.context';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { setUser } = useContext(UserContext);

    const navigate = useNavigate();

    function submitHandler(e) {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        axios.post(`${apiUrl}/users/register`, {
            email, password, name
        }).then((res) => {
            console.log(res.data)
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
            navigate('/')
        }).catch((err) => {
            console.log(err.response.data)
        })
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-xl rounded-[28px] border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(15,23,42,0.35)] overflow-hidden">
                <div className="bg-slate-950 px-8 py-10 sm:px-10">
                    <div className="mb-8">
                        <div className="inline-block rounded-full bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-300">
                            New account</div>
                        <h1 className="mt-6 text-3xl font-semibold text-white">Create your account</h1>
                        <p className="mt-3 max-w-xl text-sm text-slate-400">Start with a clean, calm registration form that feels intentional and grounded.</p>
                    </div>

                    <form onSubmit={submitHandler} className="space-y-5">


                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="johndoe"
                                    className="w-full bg-transparent pl-11 text-base text-slate-100 placeholder:text-slate-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

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
                                    placeholder="Create a password"
                                    className="w-full bg-transparent pl-11 text-base text-slate-100 placeholder:text-slate-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Confirm password</label>
                            <div className="relative rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-600">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat your password"
                                    className="w-full bg-transparent pl-11 text-base text-slate-100 placeholder:text-slate-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 hover:cursor-pointer"
                        >
                            Create account
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                        <span>Already have an account?</span>
                        <button
                            onClick={() => navigate('/login')}
                            className="font-medium text-slate-100 transition hover:text-slate-50 hover:cursor-pointer"
                        >
                            Sign in
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Register;