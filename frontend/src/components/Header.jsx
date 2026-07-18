import React from 'react';

const Header = () => {
    // Get today's date formatted nicely
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const todayDate = new Date().toLocaleDateString("en-US", dateOptions);

  return (
    <div className="d-flex justify-content-between align-items-center mb-4 pt-3">
      <div>
        <h2 className="fw-bold text-dark">Dashboard</h2>
        <p className="text-muted">{todayDate}</p>
      </div>

      
      
      {/* {Search Bar} */}
      {/* <div className="d-flex align-items-center">
        <div className="input-group" style={{width: '350px'}}>
             <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
             </span>
             <input type="text" className="form-control border-start-0 ps-0" placeholder="Search transcripts, meetings..." />
        </div>
      </div> */}
    </div>
  );
};

export default Header;