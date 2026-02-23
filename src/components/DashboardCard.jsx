import './DashboardCard.css';

export default function DashboardCard({ title, value, subtitle, icon, delay = 0 }) {
    return (
        <div
            className="dashboard-card glass-panel animate-fade-in"
            style={{ animationDelay: `${delay}s` }}
        >
            <div className="card-header">
                <h3 className="card-title">{title}</h3>
                {icon && <span className="card-icon">{icon}</span>}
            </div>
            <div className="card-body">
                <div className="card-value">{value}</div>
                {subtitle && <div className="card-subtitle">{subtitle}</div>}
            </div>
        </div>
    );
}
