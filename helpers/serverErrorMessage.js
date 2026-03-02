const serverErrorMessageRes = async (res, error) => {
  console.error(error);
  return res
    .status(500)
    .json({ message: "Unexpected error occur! Please comeback later!" });
};

module.exports = { serverErrorMessageRes };
