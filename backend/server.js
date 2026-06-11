import 'dotenv/config.js';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

io.use(async (socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];

        const projectId = socket.handshake.query.projectId;

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'))
        }


        if (!token) {
            return next(new Error('Authentication Error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication Error'))
        }

        socket.user = decoded;

        socket.project = await projectModel.findById(projectId);
        if (!socket.project) {
            return next(new Error('Project not found'))
        }

        next();

    } catch (error) {
        next(error)
    }
})


io.on('connection', socket => {
    socket.roomId = socket.project._id.toString();

    console.log('A user is connected');


    socket.join(socket.roomId);

    socket.on('project-message', async data => {

        const message = data.message;

        const aiIsPresentInMessage = message.includes('@ai');

        // ← DB mein save karo (user messages)
        await projectModel.findByIdAndUpdate(socket.roomId, {
            $push: {
                messages: {
                    sender: data.sender,
                    message: data.message
                }
            }
        })

        socket.broadcast.to(socket.roomId).emit('project-message', data)

        if (aiIsPresentInMessage) {

            const prompt = message.replace('@ai', '');

            try {
                const result = await generateResult(prompt)

                const aiMessage = {
                    message: JSON.stringify(result),
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                }

                // ← AI response bhi save karo
                await projectModel.findByIdAndUpdate(socket.roomId, {
                    $push: {
                        messages: {
                            sender: aiMessage.sender,
                            message: aiMessage.message
                        }
                    }
                })

                io.to(socket.roomId).emit('project-message', aiMessage)

            } catch (error) {
                console.error('AI generation failed:', error)
                io.to(socket.roomId).emit('project-message', {
                    message: JSON.stringify({
                        text: 'AI service is temporarily unavailable. Please try again in a few seconds.'
                    }),
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                })
            }

            return
        }

    })

    socket.on('collaborator-added', (data) => {
        io.to(socket.roomId).emit('collaborator-added', data)
    })


    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.leave(socket.roomId)
    });

    socket.on('project-deleted', (data) => {
        socket.broadcast.to(socket.roomId).emit('project-deleted', data)
    })

});


server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
