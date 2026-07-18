package com.intellimeet.backend.repository;

import com.intellimeet.backend.model.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    // FIXED QUERY: Changed 'm.participants' to 'm.participantEmails'
    @Query("SELECT m FROM Meeting m LEFT JOIN m.participantEmails p WHERE m.user.id = :userId OR p = :email")
    List<Meeting> findAllByUserIdOrParticipantEmail(@Param("userId") Long userId, @Param("email") String email);

    Meeting findByRoomId(String roomId);
}