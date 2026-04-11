const EmptyState = ({ title, description, action }) => {
    return (
        <div className="rounded-2xl border border-dashed border-borderColor bg-white/70 px-6 py-12 text-center text-gray-600">
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{description}</p>
            {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
        </div>
    );
};

export default EmptyState;
