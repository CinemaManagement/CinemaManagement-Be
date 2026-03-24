const Expense = require("../models/Expense");
const { ROLE } = require("../constraints/role");

const VALID_TYPES = ["SALARY", "UTILITY", "MAINTENANCE", "RENT", "MARKETING", "OTHER"];

const createExpense = async (req, res) => {
    try {
        const userId = req.userId || req.user?._id;
        if (!userId) return res.status(403).json({ message: "Authenticated user not found" });

        const { type, amount, date, description } = req.body;

        if (!type || !VALID_TYPES.includes(type)) {
            return res.status(400).json({ message: "type is required and must be one of [SALARY, UTILITY, MAINTENANCE, RENT, MARKETING, OTHER]" });
        }

        if (typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({ message: "amount is required and must be a number greater than 0" });
        }

        if (!date) {
            return res.status(400).json({ message: "date is required" });
        }

        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "date must be a valid ISO date" });
        }

        const expense = new Expense({
            type,
            amount,
            date: parsedDate,
            description: description || "",
            createdBy: userId,
        });

        await expense.save();

        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getHistory = async (req, res) => {
    try {
        const filter = {};
        const { type, fromDate, toDate, page = 1, limit = 20 } = req.query;

        if (type) {
            if (!VALID_TYPES.includes(type)) {
                return res.status(400).json({ message: "type must be one of [SALARY, UTILITY, MAINTENANCE, RENT, MARKETING, OTHER]" });
            }
            filter.type = type;
        }

        if (fromDate || toDate) {
            const dateRange = {};
            if (fromDate) {
                const from = new Date(fromDate);
                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({ message: "fromDate must be a valid ISO date" });
                }
                dateRange.$gte = from;
            }
            if (toDate) {
                const to = new Date(toDate);
                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({ message: "toDate must be a valid ISO date" });
                }
                dateRange.$lte = to;
            }
            filter.date = dateRange;
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        if (Number.isNaN(pageNum) || pageNum <= 0) {
            return res.status(400).json({ message: "page must be a positive integer" });
        }
        if (Number.isNaN(limitNum) || limitNum <= 0) {
            return res.status(400).json({ message: "limit must be a positive integer" });
        }

        const query = Expense.find(filter).sort({ date: -1 });
        const total = await Expense.countDocuments(filter);

        const expenses = await query
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .exec();

        res.status(200).json({ expenses, total, page: pageNum, limit: limitNum });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createExpense,
    getHistory,
};
