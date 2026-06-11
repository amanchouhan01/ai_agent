import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        _id: { type: String, required: true },
        email: { type: String, required: true }
    },
    message: {
        type: String,
        required: true
    }
}, { timestamps: true })


const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true,
        trim: true,
        unique: true,
    },

    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        }
    ],

    fileTree: {
        type: Object,
        default: {}
    },
    messages: [messageSchema]
},
    { timestamps: true }
)


const Project = mongoose.model('project', projectSchema)

export default Project;