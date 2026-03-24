const mongoose = require("mongoose");
const STATUS = require("../constraints/status");
const Schema = mongoose.Schema;

const MovieSchema = new Schema(
  {
    title: { type: String, require },
    duration: { type: Number, require },
    ageRestriction: { type: Number, require },
    posterUrl: { type: String, require },
    trailerUrl: { type: String, require },
    revenueSharePercent: { type: Number, require },
    category: [{ type: String }],
    description: { type: String },
    director: [{
      name: { type: String },
      avatar: { type: String }
    }],
    actors: [{
      name: { type: String },
      avatar: { type: String }
    }],
    rate: { type: Number, default: 0 },
    ratings: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        score: { type: Number },
      },
    ],
    releaseDate: { type: Date },
    showingStatus: {
      type: String,
      enum: [STATUS.SHOWING, STATUS.COMING_SOON, STATUS.STOPPED],
      default: STATUS.SHOWING
    },
    status: { type: String, default: STATUS.ACTIVE },
  },
  { timestamps: true },
);

MovieSchema.pre("save", function (next) {
  if (this.releaseDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const release = new Date(this.releaseDate);
    release.setHours(0, 0, 0, 0);

    if (today < release) {
      if (this.showingStatus !== STATUS.STOPPED) {
        this.showingStatus = STATUS.COMING_SOON;
      }
    } else {
      if (this.showingStatus !== STATUS.STOPPED) {
        this.showingStatus = STATUS.SHOWING;
      }
    }
  }
  next();
});

module.exports = mongoose.model("Movie", MovieSchema);
